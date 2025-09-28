import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { WS_CONFIG } from '../utils/constants'

export const useWebSocket = (sessionId = null, onMessage = null) => {
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectCount, setReconnectCount] = useState(0)
  const [lastMessage, setLastMessage] = useState(null)
  
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttempts = useRef(0)

  const connect = useCallback(() => {
    try {
      const wsUrl = sessionId 
        ? `${WS_CONFIG.BASE_URL}/${sessionId}`
        : `${WS_CONFIG.BASE_URL}/dashboard`
      
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        reconnectAttempts.current = 0
        setReconnectCount(0)
        console.log('WebSocket connected:', wsUrl)
        
        if (reconnectCount > 0) {
          toast.success('Reconnected to server')
        }
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          setLastMessage(message)
          
          if (onMessage) {
            onMessage(message)
          }
          
          // Handle special message types
          if (message.type === 'alert') {
            toast.error(message.data.message, {
              duration: 5000,
              position: 'top-right'
            })
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        
        // Attempt reconnection if not at max attempts
        if (reconnectAttempts.current < WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1
          setReconnectCount(reconnectAttempts.current)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnection attempt ${reconnectAttempts.current}`)
            connect()
          }, WS_CONFIG.RECONNECT_INTERVAL)
          
          toast.error(`Connection lost. Retrying... (${reconnectAttempts.current}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS})`)
        } else {
          toast.error('Unable to maintain connection to server')
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }

    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      setIsConnected(false)
    }
  }, [sessionId, onMessage, reconnectCount])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
    reconnectAttempts.current = 0
    setReconnectCount(0)
  }, [])

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
        return true
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
        toast.error('Failed to send message')
        return false
      }
    } else {
      console.warn('WebSocket not connected, cannot send message')
      toast.error('Connection not available')
      return false
    }
  }, [])

  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    reconnectCount,
    lastMessage,
    sendMessage,
    connect,
    disconnect
  }
}