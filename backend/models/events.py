from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class EventType(str, Enum):
    EYE_TRACKING = "eye_tracking"
    AUDIO = "audio"
    SCREEN = "screen"
    SYSTEM = "system"

class GazeDirection(str, Enum):
    CENTER = "center"
    LEFT = "left"
    RIGHT = "right"
    UP = "up"
    DOWN = "down"

class SessionStatus(str, Enum):
    NORMAL = "NORMAL"
    SUSPICIOUS = "SUSPICIOUS"
    FLAGGED = "FLAGGED"

class HeadPose(BaseModel):
    pitch: float
    yaw: float
    roll: float

class EyeTrackingEvent(BaseModel):
    gaze_direction: GazeDirection
    head_pose: HeadPose
    face_count: int = 1
    confidence: float = 0.0
    landmarks_detected: bool = True

class AudioEvent(BaseModel):
    speech_detected: bool = False
    multiple_voices: bool = False
    audio_level: float = 0.0
    silence_duration: float = 0.0
    background_noise_level: float = 0.0

class ScreenEvent(BaseModel):
    event_type: str  # 'tab_change', 'copy', 'paste', 'window_blur', 'fullscreen_exit'
    visible: Optional[bool] = None
    clipboard_data: Optional[str] = None
    window_title: Optional[str] = None

class BaseEvent(BaseModel):
    session_id: str
    timestamp: datetime
    event_type: EventType
    data: Dict[str, Any]

class ScoreData(BaseModel):
    session_id: str
    score: int
    status: SessionStatus
    flags: List[str]
    timestamp: datetime
    events_count: Dict[str, int]
    details: Dict[str, Any]

class SessionInfo(BaseModel):
    session_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    total_score: int = 0
    current_status: SessionStatus = SessionStatus.NORMAL
    event_count: int = 0
    flags_count: int = 0