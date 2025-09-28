class EyeTracker {
  constructor() {
    this.isRunning = false
    this.lastGaze = 'center'
    this.gazeHistory = []
    this.faceDetectionModel = null
    
    // Initialize mock MediaPipe
    this.initializeFaceDetection()
  }

  initializeFaceDetection() {
    // Mock MediaPipe initialization
    console.log('EyeTracker: Initializing mock MediaPipe FaceMesh...')
    
    // Simulate model loading delay
    setTimeout(() => {
      this.faceDetectionModel = {
        loaded: true,
        version: 'mock-v1.0',
        landmarks: 468 // MediaPipe FaceMesh landmark count
      }
      console.log('EyeTracker: Mock MediaPipe model loaded')
    }, 1000)
  }

  startTracking() {
    if (this.isRunning) return
    
    this.isRunning = true
    this.gazeHistory = []
    console.log('EyeTracker: Starting eye tracking analysis')
    
    this.trackingLoop()
  }

  stopTracking() {
    this.isRunning = false
    this.gazeHistory = []
    console.log('EyeTracker: Eye tracking stopped')
  }

  trackingLoop() {
    if (!this.isRunning) return

    try {
      // Simulate eye tracking analysis
      const analysis = this.performEyeAnalysis()
      
      // Send results to main thread
      self.postMessage({
        type: 'eye_tracking_result',
        data: analysis,
        timestamp: Date.now()
      })
      
      // Continue analysis loop
      setTimeout(() => this.trackingLoop(), 1000) // 1 FPS for demo
      
    } catch (error) {
      console.error('EyeTracker: Analysis error:', error)
      self.postMessage({
        type: 'error',
        data: { message: 'Eye tracking analysis failed', error: error.message }
      })
    }
  }

  performEyeAnalysis() {
    // Simulate realistic eye tracking behavior
    const currentTime = Date.now()
    
    // Generate realistic gaze patterns
    const gazeDirection = this.generateRealisticGaze()
    const headPose = this.generateHeadPose()
    const faceCount = this.detectFaceCount()
    const confidence = this.calculateConfidence()
    
    // Track gaze history for pattern detection
    this.gazeHistory.push({
      gaze: gazeDirection,
      timestamp: currentTime
    })
    
    // Keep only last 30 seconds of history
    const thirtySecondsAgo = currentTime - 30000
    this.gazeHistory = this.gazeHistory.filter(entry => entry.timestamp > thirtySecondsAgo)
    
    return {
      gaze_direction: gazeDirection,
      head_pose: headPose,
      face_count: faceCount,
      confidence: confidence,
      landmarks_detected: confidence > 0.5,
      gaze_stability: this.calculateGazeStability(),
      eye_aspect_ratio: this.calculateEyeAspectRatio(),
      blink_rate: this.calculateBlinkRate()
    }
  }

  generateRealisticGaze() {
    const gazeDirections = ['center', 'left', 'right', 'up', 'down']
    const weights = [0.6, 0.1, 0.1, 0.1, 0.1] // 60% center, 10% each other direction
    
    // Add some temporal coherence - slight bias towards previous gaze
    if (this.lastGaze !== 'center' && Math.random() < 0.3) {
      return this.lastGaze // 30% chance to maintain non-center gaze
    }
    
    // Weighted random selection
    const random = Math.random()
    let cumulative = 0
    
    for (let i = 0; i < gazeDirections.length; i++) {
      cumulative += weights[i]
      if (random < cumulative) {
        this.lastGaze = gazeDirections[i]
        return gazeDirections[i]
      }
    }
    
    this.lastGaze = 'center'
    return 'center'
  }

  generateHeadPose() {
    // Generate realistic head pose values (in degrees)
    const baseVariation = 5 // Normal head movement variation
    
    return {
      pitch: (Math.random() - 0.5) * baseVariation * 2, // -5 to 5 degrees
      yaw: (Math.random() - 0.5) * baseVariation * 4,   // -10 to 10 degrees  
      roll: (Math.random() - 0.5) * baseVariation * 2   // -5 to 5 degrees
    }
  }

  detectFaceCount() {
    // Simulate face detection - mostly 1 face, occasionally 0 or 2+
    const random = Math.random()
    
    if (random < 0.05) return 0 // 5% chance no face detected
    if (random < 0.95) return 1 // 90% chance single face
    return Math.floor(Math.random() * 3) + 2 // 5% chance 2-4 faces
  }

  calculateConfidence() {
    // Simulate detection confidence based on various factors
    const baseFidelity = 0.85 + Math.random() * 0.1 // 85-95% base confidence
    
    // Reduce confidence if multiple faces or no faces
    const faceCount = this.detectFaceCount()
    if (faceCount !== 1) {
      return Math.max(0.3, baseFidelity - 0.3)
    }
    
    return baseFidelity
  }

  calculateGazeStability() {
    if (this.gazeHistory.length < 3) return 1.0
    
    // Calculate how stable the gaze has been
    const recentGazes = this.gazeHistory.slice(-5)
    const centerCount = recentGazes.filter(entry => entry.gaze === 'center').length
    
    return centerCount / recentGazes.length
  }

  calculateEyeAspectRatio() {
    // Simulate Eye Aspect Ratio (EAR) for blink detection
    // Normal EAR is around 0.25-0.3, drops during blinks
    const normalEAR = 0.25 + Math.random() * 0.05
    
    // Occasionally simulate blink (very low EAR)
    if (Math.random() < 0.05) { // 5% chance of blink
      return 0.05 + Math.random() * 0.05
    }
    
    return normalEAR
  }

  calculateBlinkRate() {
    // Average human blink rate is 15-20 blinks per minute
    // Return blinks per minute with some variation
    return 15 + Math.random() * 10
  }
}

// Worker message handling
let eyeTracker = null

self.onmessage = function(event) {
  const { command, data } = event.data

  switch (command) {
    case 'start':
      if (!eyeTracker) {
        eyeTracker = new EyeTracker()
      }
      eyeTracker.startTracking()
      break
      
    case 'stop':
      if (eyeTracker) {
        eyeTracker.stopTracking()
      }
      break
      
    case 'configure':
      // Handle configuration changes
      console.log('EyeTracker: Configuration update:', data)
      break
      
    default:
      console.warn('EyeTracker: Unknown command:', command)
  }
}