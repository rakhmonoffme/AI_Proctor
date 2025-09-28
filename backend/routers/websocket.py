from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
import asyncio
import logging
from datetime import datetime

from models.events import BaseEvent, EventType
from models.scoring import RiskScorer
from utils.database import events_db, active_sessions

router = APIRouter()
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.session_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if session_id:
            self.session_connections[session_id] = websocket
        logger.info(f"Client connected. Session: {session_id}. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, session_id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if session_id and session_id in self.session_connections:
            del self.session_connections[session_id]
        logger.info(f"Client disconnected. Session: {session_id}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

    async def send_to_session(self, session_id: str, message: str):
        if session_id in self.session_connections:
            try:
                await self.session_connections[session_id].send_text(message)
            except:
                self.disconnect(self.session_connections[session_id], session_id)

manager = ConnectionManager()
scorer = RiskScorer()

async def score_calculator():
    """Background task to calculate scores every 10 seconds"""
    while True:
        try:
            await asyncio.sleep(10)
            
            for session_id in list(active_sessions.keys()):
                try:
                    score_data = scorer.calculate_score(session_id, events_db)
                    events_db["scores"].append(score_data)
                    
                    # Keep only last 100 scores
                    if len(events_db["scores"]) > 100:
                        events_db["scores"] = events_db["scores"][-100:]
                    
                    # Broadcast to all connected clients
                    await manager.broadcast(json.dumps({
                        "type": "score_update",
                        "data": {
                            **score_data,
                            "timestamp": score_data["timestamp"].isoformat()
                        }
                    }))
                    
                    # Send alert to specific session if flagged
                    if score_data["status"] == "FLAGGED":
                        await manager.send_to_session(session_id, json.dumps({
                            "type": "alert",
                            "data": {
                                "message": "Suspicious behavior detected!",
                                "score": score_data["score"],
                                "flags": score_data["flags"]
                            }
                        }))
                    
                    logger.info(f"Score: {session_id} - {score_data['score']} ({score_data['status']})")
                    
                except Exception as e:
                    logger.error(f"Error calculating score for {session_id}: {e}")
                
        except Exception as e:
            logger.error(f"Error in score calculator: {e}")

# Start background task
asyncio.create_task(score_calculator())

@router.websocket("/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    
    # Initialize session
    active_sessions[session_id] = {
        "start_time": datetime.now(),
        "websocket": websocket,
        "event_count": 0,
        "last_activity": datetime.now()
    }
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Process incoming event
            await process_event(session_id, message)
            
            # Update session activity
            active_sessions[session_id]["last_activity"] = datetime.now()
            active_sessions[session_id]["event_count"] += 1
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
        if session_id in active_sessions:
            active_sessions[session_id]["end_time"] = datetime.now()
            # Keep session data for historical purposes but mark as ended
        logger.info(f"Session {session_id} ended")

async def process_event(session_id: str, message: Dict):
    """Process and store incoming events"""
    try:
        event_type = message.get("type")
        event_data = message.get("data", {})
        
        # Add metadata
        event_data.update({
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
            "processed_at": datetime.now().isoformat()
        })
        
        # Validate and store event
        if event_type in ["eye_tracking", "audio", "screen", "system"]:
            events_db[event_type].append(event_data)
            
            # Maintain database size
            if len(events_db[event_type]) > 1000:
                events_db[event_type] = events_db[event_type][-500:]
        
        # Broadcast to dashboard clients
        await manager.broadcast(json.dumps({
            "type": "live_event",
            "data": {
                "event_type": event_type,
                "session_id": session_id,
                **event_data
            }
        }))
        
        logger.debug(f"Processed {event_type} event for session {session_id}")
        
    except Exception as e:
        logger.error(f"Error processing event: {e}")

@router.websocket("/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)