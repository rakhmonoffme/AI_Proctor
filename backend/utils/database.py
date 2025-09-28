from typing import Dict, List, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# In-memory database for demo purposes
events_db: Dict[str, List[Dict[str, Any]]] = {
    "eye_tracking": [],
    "audio": [],
    "screen": [],
    "system": [],
    "scores": []
}

# Active sessions storage
active_sessions: Dict[str, Dict[str, Any]] = {}

def init_db():
    """Initialize database with sample data if needed"""
    logger.info("Database initialized")
    logger.info(f"Event types available: {list(events_db.keys())}")

def get_session_events(session_id: str, event_type: str = None) -> List[Dict]:
    """Get events for a specific session"""
    if event_type:
        return [
            event for event in events_db.get(event_type, [])
            if event.get("session_id") == session_id
        ]
    
    # Return all events for session
    all_events = []
    for events in events_db.values():
        session_events = [
            event for event in events
            if event.get("session_id") == session_id
        ]
        all_events.extend(session_events)
    
    return sorted(all_events, key=lambda x: x.get("timestamp", ""))

def cleanup_old_data():
    """Clean up old data to prevent memory issues"""
    MAX_EVENTS_PER_TYPE = 1000
    
    for event_type in events_db:
        if len(events_db[event_type]) > MAX_EVENTS_PER_TYPE:
            # Keep the most recent events
            events_db[event_type] = events_db[event_type][-MAX_EVENTS_PER_TYPE:]
            logger.info(f"Cleaned up {event_type} events")