from datetime import datetime, timedelta
from typing import List, Dict, Any
from .events import SessionStatus, EventType, GazeDirection
import logging

logger = logging.getLogger(__name__)

class RiskScorer:
    """Advanced risk scoring system for proctoring events"""
    
    # Scoring weights
    GAZE_WEIGHTS = {
        GazeDirection.LEFT: 2,
        GazeDirection.RIGHT: 2,
        GazeDirection.DOWN: 3,
        GazeDirection.UP: 1,
        GazeDirection.CENTER: 0
    }
    
    SCREEN_EVENT_WEIGHTS = {
        'tab_change': 5,
        'copy': 7,
        'paste': 7,
        'window_blur': 4,
        'fullscreen_exit': 8
    }
    
    AUDIO_WEIGHTS = {
        'speech_detected': 3,
        'multiple_voices': 5,
        'high_noise': 2
    }
    
    # Thresholds
    SUSPICIOUS_THRESHOLD = 6
    FLAGGED_THRESHOLD = 11
    
    def __init__(self):
        self.time_window = timedelta(seconds=10)
    
    def calculate_score(self, session_id: str, events_db: Dict) -> Dict[str, Any]:
        """Calculate comprehensive risk score for a session"""
        now = datetime.now()
        cutoff_time = now - self.time_window
        
        score = 0
        flags = []
        details = {
            'gaze_violations': 0,
            'screen_violations': 0,
            'audio_violations': 0,
            'pattern_violations': 0
        }
        
        # Get recent events
        recent_events = self._get_recent_events(session_id, events_db, cutoff_time)
        
        # Score eye tracking events
        eye_score, eye_flags, eye_details = self._score_eye_tracking(recent_events.get('eye_tracking', []))
        score += eye_score
        flags.extend(eye_flags)
        details.update(eye_details)
        
        # Score audio events
        audio_score, audio_flags, audio_details = self._score_audio(recent_events.get('audio', []))
        score += audio_score
        flags.extend(audio_flags)
        details.update(audio_details)
        
        # Score screen events
        screen_score, screen_flags, screen_details = self._score_screen(recent_events.get('screen', []))
        score += screen_score
        flags.extend(screen_flags)
        details.update(screen_details)
        
        # Check for behavioral patterns
        pattern_score, pattern_flags = self._detect_patterns(recent_events)
        score += pattern_score
        flags.extend(pattern_flags)
        
        # Determine status
        if score >= self.FLAGGED_THRESHOLD:
            status = SessionStatus.FLAGGED
        elif score >= self.SUSPICIOUS_THRESHOLD:
            status = SessionStatus.SUSPICIOUS
        else:
            status = SessionStatus.NORMAL
        
        return {
            "session_id": session_id,
            "score": score,
            "status": status,
            "flags": flags,
            "timestamp": now,
            "events_count": {k: len(v) for k, v in recent_events.items()},
            "details": details
        }
    
    def _get_recent_events(self, session_id: str, events_db: Dict, cutoff_time: datetime) -> Dict:
        """Get events within the time window for a specific session"""
        recent_events = {}
        
        for event_type, events in events_db.items():
            if event_type == 'scores':
                continue
                
            recent = []
            for event in events:
                if (event.get('session_id') == session_id and 
                    datetime.fromisoformat(event['timestamp']) > cutoff_time):
                    recent.append(event)
            
            recent_events[event_type] = recent
        
        return recent_events
    
    def _score_eye_tracking(self, events: List[Dict]) -> tuple:
        """Score eye tracking violations"""
        score = 0
        flags = []
        details = {'gaze_violations': 0, 'multiple_faces': 0, 'head_movement': 0}
        
        gaze_violations = 0
        multiple_faces_count = 0
        suspicious_head_movement = 0
        
        for event in events:
            gaze = event.get('gaze_direction')
            face_count = event.get('face_count', 1)
            head_pose = event.get('head_pose', {})
            
            # Score gaze direction
            if gaze in self.GAZE_WEIGHTS:
                gaze_score = self.GAZE_WEIGHTS[gaze]
                score += gaze_score
                if gaze_score > 0:
                    gaze_violations += 1
            
            # Score multiple faces
            if face_count > 1:
                score += 10
                multiple_faces_count += 1
            
            # Score head movement
            if isinstance(head_pose, dict):
                pitch = abs(head_pose.get('pitch', 0))
                yaw = abs(head_pose.get('yaw', 0))
                
                if pitch > 30 or yaw > 45:
                    score += 1
                    suspicious_head_movement += 1
        
        # Generate flags
        if gaze_violations > 3:
            flags.append(f"Excessive gaze movement ({gaze_violations} violations)")
        if multiple_faces_count > 0:
            flags.append(f"Multiple faces detected ({multiple_faces_count} times)")
        if suspicious_head_movement > 2:
            flags.append(f"Suspicious head movement pattern")
        
        details.update({
            'gaze_violations': gaze_violations,
            'multiple_faces': multiple_faces_count,
            'head_movement': suspicious_head_movement
        })
        
        return score, flags, details
    
    def _score_audio(self, events: List[Dict]) -> tuple:
        """Score audio violations"""
        score = 0
        flags = []
        details = {'speech_events': 0, 'multiple_voices': 0, 'noise_violations': 0}
        
        speech_count = 0
        voice_count = 0
        noise_violations = 0
        
        for event in events:
            if event.get('speech_detected'):
                score += self.AUDIO_WEIGHTS['speech_detected']
                speech_count += 1
            
            if event.get('multiple_voices'):
                score += self.AUDIO_WEIGHTS['multiple_voices']
                voice_count += 1
            
            # Check background noise
            noise_level = event.get('background_noise_level', 0)
            if noise_level > 70:  # Arbitrary threshold
                score += self.AUDIO_WEIGHTS['high_noise']
                noise_violations += 1
        
        # Generate flags
        if speech_count > 0:
            flags.append(f"Speech detected ({speech_count} times)")
        if voice_count > 0:
            flags.append(f"Multiple voices detected ({voice_count} times)")
        if noise_violations > 2:
            flags.append(f"High background noise")
        
        details.update({
            'speech_events': speech_count,
            'multiple_voices': voice_count,
            'noise_violations': noise_violations
        })
        
        return score, flags, details
    
    def _score_screen(self, events: List[Dict]) -> tuple:
        """Score screen activity violations"""
        score = 0
        flags = []
        details = {'tab_changes': 0, 'copy_paste': 0, 'focus_loss': 0}
        
        event_counts = {}
        
        for event in events:
            event_type = event.get('event_type')
            if event_type in self.SCREEN_EVENT_WEIGHTS:
                score += self.SCREEN_EVENT_WEIGHTS[event_type]
                event_counts[event_type] = event_counts.get(event_type, 0) + 1
        
        # Generate flags
        if event_counts.get('tab_change', 0) > 0:
            flags.append(f"Tab switching detected ({event_counts['tab_change']} times)")
        
        copy_paste_total = event_counts.get('copy', 0) + event_counts.get('paste', 0)
        if copy_paste_total > 0:
            flags.append(f"Copy/paste activity ({copy_paste_total} times)")
        
        if event_counts.get('window_blur', 0) > 1:
            flags.append(f"Frequent window focus loss")
        
        details.update({
            'tab_changes': event_counts.get('tab_change', 0),
            'copy_paste': copy_paste_total,
            'focus_loss': event_counts.get('window_blur', 0)
        })
        
        return score, flags, details
    
    def _detect_patterns(self, events_by_type: Dict) -> tuple:
        """Detect suspicious behavioral patterns"""
        score = 0
        flags = []
        
        # Pattern 1: Rapid gaze switching
        eye_events = events_by_type.get('eye_tracking', [])
        if len(eye_events) > 5:
            gaze_changes = 0
            prev_gaze = None
            for event in eye_events:
                current_gaze = event.get('gaze_direction')
                if prev_gaze and current_gaze != prev_gaze and current_gaze != 'center':
                    gaze_changes += 1
                prev_gaze = current_gaze
            
            if gaze_changes > 3:
                score += 3
                flags.append("Rapid gaze switching pattern detected")
        
        # Pattern 2: Copy-paste immediately after tab change
        screen_events = events_by_type.get('screen', [])
        screen_events.sort(key=lambda x: x['timestamp'])
        
        for i in range(len(screen_events) - 1):
            if (screen_events[i].get('event_type') == 'tab_change' and
                screen_events[i + 1].get('event_type') in ['copy', 'paste']):
                time_diff = (datetime.fromisoformat(screen_events[i + 1]['timestamp']) - 
                           datetime.fromisoformat(screen_events[i]['timestamp'])).total_seconds()
                if time_diff < 5:  # Within 5 seconds
                    score += 5
                    flags.append("Suspicious tab-change followed by copy/paste")
        
        return score, flags