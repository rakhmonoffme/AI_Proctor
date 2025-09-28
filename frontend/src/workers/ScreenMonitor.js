class ScreenMonitor {
  constructor() {
    this.isMonitoring = false
    this.eventHistory = []
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (this.isMonitoring) {
        this.recordEvent('tab_change', {
          visible: !document.hidden,
          timestamp: Date.now()
        })
      }
    })

    // Copy events
    document.addEventListener('copy', (e) => {
      if (this.isMonitoring) {
        this.recordEvent('copy', {
          hasSelection: window.getSelection().toString().length > 0,
          timestamp: Date.now()
        })
      }
    })

    // Paste events
    document.addEventListener('paste', (e) => {
      if (this.isMonitoring) {
        this.recordEvent('paste', {
          timestamp: Date.now()
        })
      }
    })

    // Window focus/blur
    window.addEventListener('blur', () => {
      if (this.isMonitoring) {
        this.recordEvent('window_blur', {
          timestamp: Date.now()
        })
      }
    })

    window.addEventListener('focus', () => {
      if (this.isMonitoring) {
        this.recordEvent('window_focus', {
          timestamp: Date.now()
        })
      }
    })

    // Fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      if (this.isMonitoring) {
        this.recordEvent('fullscreen_change', {
          isFullscreen: !!document.fullscreenElement,
          timestamp: Date.now()
        })
      }
    })

    // Context menu (right-click)
    document.addEventListener('contextmenu', (e) => {
      if (this.isMonitoring) {
        this.recordEvent('context_menu', {
          prevented: false,
          timestamp: Date.now()
        })
      }
    })

    // Keyboard shortcuts monitoring
    document.addEventListener('keydown', (e) => {
      if (this.isMonitoring && this.isRelevantKeyEvent(e)) {
        this.recordEvent('keyboard_shortcut', {
          key: e.key,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          metaKey: e.metaKey,
          timestamp: Date.now()
        })
      }
    })
  }

  isRelevantKeyEvent(e) {
    // Track potentially suspicious keyboard shortcuts
    const suspiciousKeys = [
      'F12', // Dev tools
      'F5',  // Refresh
      'Tab', // Alt+Tab for switching
    ]

    if (suspiciousKeys.includes(e.key)) return true

    // Ctrl/Cmd combinations
    if (e.ctrlKey || e.metaKey) {
      const relevantCombos = ['c', 'v', 't', 'w', 'r', 'f', 'h', 'j']
      return relevantCombos.includes(e.key.toLowerCase())
    }

    return false
  }

  startMonitoring() {
    this.isMonitoring = true
    this.eventHistory = []
    
    console.log('ScreenMonitor: Started monitoring screen events')
    
    // Send initial status
    self.postMessage({
      type: 'monitoring_started',
      data: {
        timestamp: Date.now(),
        windowDimensions: {
          width: window.screen.width,
          height: window.screen.height
        },
        isFullscreen: !!document.fullscreenElement,
        hasFocus: document.hasFocus()
      }
    })
  }

  stopMonitoring() {
    this.isMonitoring = false
    
    console.log('ScreenMonitor: Stopped monitoring screen events')
    
    self.postMessage({
      type: 'monitoring_stopped',
      data: {
        timestamp: Date.now(),
        totalEvents: this.eventHistory.length
      }
    })
  }

  recordEvent(eventType, eventData) {
    const event = {
      event_type: eventType,
      ...eventData,
      timestamp: Date.now()
    }

    this.eventHistory.push(event)

    // Keep history manageable
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-500)
    }

    // Send event to main thread
    self.postMessage({
      type: 'screen_event',
      data: event
    })

    console.log('ScreenMonitor: Recorded event:', eventType)
  }

  getEventSummary(timeWindow = 60000) { // Last minute by default
    const cutoff = Date.now() - timeWindow
    const recentEvents = this.eventHistory.filter(e => e.timestamp > cutoff)

    const summary = {}
    recentEvents.forEach(event => {
      summary[event.event_type] = (summary[event.event_type] || 0) + 1
    })

    return {
      summary,
      totalEvents: recentEvents.length,
      timeWindow: timeWindow
    }
  }
}

// Worker message handling
let screenMonitor = null

self.onmessage = function(event) {
  const { command, data } = event.data

  switch (command) {
    case 'start':
      if (!screenMonitor) {
        screenMonitor = new ScreenMonitor()
      }
      screenMonitor.startMonitoring()
      break
      
    case 'stop':
      if (screenMonitor) {
        screenMonitor.stopMonitoring()
      }
      break
      
    case 'getSummary':
      if (screenMonitor) {
        const summary = screenMonitor.getEventSummary(data?.timeWindow)
        self.postMessage({
          type: 'event_summary',
          data: summary
        })
      }
      break
      
    default:
      console.warn('ScreenMonitor: Unknown command:', command)
  }
}