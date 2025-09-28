import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Mic, Monitor, AlertTriangle, Clock, User } from 'lucide-react'
import { formatTime, getEventTypeIcon } from '../utils/helpers'

const LiveEventsFeed = ({ events, maxEvents = 100 }) => {
  const [filteredEvents, setFilteredEvents] = useState([])
  const [filter, setFilter] = useState('all')
  const [isAutoScroll, setIsAutoScroll] = useState(true)

  useEffect(() => {
    let filtered = events
    
    if (filter !== 'all') {
      filtered = events.filter(event => event.event_type === filter)
    }
    
    setFilteredEvents(filtered.slice(0, maxEvents))
  }, [events, filter, maxEvents])

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'eye_tracking': return 
      case 'audio': return 
      case 'screen': return 
      case 'system': return 
      default: return 
    }
  }

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'eye_tracking': return 'text-blue-400 bg-blue-900/20'
      case 'audio': return 'text-red-400 bg-red-900/20'
      case 'screen': return 'text-purple-400 bg-purple-900/20'
      case 'system': return 'text-yellow-400 bg-yellow-900/20'
      default: return 'text-gray-400 bg-gray-800'
    }
  }

  const getEventDescription = (event) => {
    const { event_type, data } = event
    
    switch (event_type) {
      case 'eye_tracking':
        return `Gaze: ${data.gaze_direction}, Faces: ${data.face_count || 1}`
      case 'audio':
        return `Speech: ${data.speech_detected ? 'Yes' : 'No'}, Level: ${Math.round(data.audio_level || 0)}`
      case 'screen':
        return `Action: ${data.event_type}, Window: ${data.visible !== undefined ? (data.visible ? 'Visible' : 'Hidden') : 'N/A'}`
      case 'system':
        return data.message || 'System event'
      default:
        return 'Unknown event'
    }
  }

  return (
    
      
        Live Events Feed
        
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field text-sm py-1"
          >
            All Events
            Eye Tracking
            Audio
            Screen
            System
          
          <button
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            className={`text-xs px-2 py-1 rounded ${
              isAutoScroll ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            Auto-scroll
          
        
      

      
        
          {filteredEvents.map((event, index) => (
            
              
                {getEventIcon(event.event_type)}
              
              
              
                
                  
                    {event.event_type.replace('_', ' ')}
                  
                  
                    {formatTime(event.timestamp)}
                  
                
                
                
                  {getEventDescription(event)}
                
                
                {event.session_id && (
                  
                    
                    
                      {event.session_id.split('_')[1]}
                    
                  
                )}
              
            
          ))}
        

        {filteredEvents.length === 0 && (
          
            
            No events to display
            Events will appear here in real-time
          
        )}
      

      
        Showing {filteredEvents.length} of {events.length} events
        Filter: {filter === 'all' ? 'All Types' : filter.replace('_', ' ')}
      
    
  )
}

export default LiveEventsFeed