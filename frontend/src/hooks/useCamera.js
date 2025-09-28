import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'

export const useCamera = () => {
  const [isActive, setIsActive] = useState(false)
  const [hasPermission, setHasPermission] = useState(null)
  const [error, setError] = useState(null)
  
  const streamRef = useRef(null)
  const videoRef = useRef(null)

  const requestPermissions = useCallback(async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 }
        },
        audio: true
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Test permissions by getting the stream, then stop it
      stream.getTracks().forEach(track => track.stop())
      
      setHasPermission(true)
      setError(null)
      return true
      
    } catch (error) {
      console.error('Error requesting camera permissions:', error)
      
      let errorMessage = 'Failed to access camera and microphone'
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera and microphone access denied. Please allow permissions and refresh the page.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found on this device.'
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera or microphone not supported on this browser.'
      }
      
      setError(errorMessage)
      setHasPermission(false)
      toast.error(errorMessage)
      return false
    }
  }, [])

  const startCamera = useCallback(async () => {
    if (isActive) return true

    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 }
        },
        audio: true
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      setIsActive(true)
      setHasPermission(true)
      setError(null)
      
      toast.success('Camera started successfully')
      return true
      
    } catch (error) {
      console.error('Error starting camera:', error)
      
      let errorMessage = 'Failed to start camera'
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Camera not found'
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    }
  }, [isActive])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsActive(false)
    toast.success('Camera stopped')
  }, [])

  const takeScreenshot = useCallback(() => {
    if (!videoRef.current || !isActive) return null

    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      
      context.drawImage(videoRef.current, 0, 0)
      
      return canvas.toDataURL('image/jpeg', 0.8)
    } catch (error) {
      console.error('Error taking screenshot:', error)
      return null
    }
  }, [isActive])

  return {
    isActive,
    hasPermission,
    error,
    videoRef,
    startCamera,
    stopCamera,
    requestPermissions,
    takeScreenshot
  }
}