from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
import os
import logging
from pathlib import Path

from routers import websocket, api
from utils.database import init_db

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Proctoring System",
    description="Real-time AI-powered exam proctoring with behavioral analysis",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# Include routers
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])
app.include_router(api.router, prefix="/api", tags=["api"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "AI Proctoring System"}

# Serve frontend static files in production
if os.path.exists("../frontend/dist"):
    app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")
else:
    @app.get("/")
    async def root():
        return HTMLResponse("""
        
        
        
            AI Proctoring System
            
                body { font-family: Arial, sans-serif; padding: 40px; background: #1a1a1a; color: white; }
                .container { max-width: 600px; margin: 0 auto; text-align: center; }
                .status { color: #10b981; font-size: 18px; margin: 20px 0; }
            
        
        
            
                🤖 AI Proctoring System
                ✅ Backend Server Running
                Backend is running on port 8000
                Start the frontend with: cd frontend && npm run dev
                Then visit: http://localhost:5173
            
        
        
        """)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)