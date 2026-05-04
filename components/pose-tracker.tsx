"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, AlertCircle, Wifi, WifiOff, Activity, Users } from "lucide-react"

interface PoseTrackerProps {
  exercise: string
  isTracking: boolean
  onTrackingStart: () => void
  onTrackingStop: () => void
  onDataReceived: (data: any) => void
}

interface PoseData {
  keypoints: Array<{
    x: number
    y: number
    confidence: number
    name: string
  }>
  score: number
  timestamp: number
}

interface ExerciseMetrics {
  repCount: number
  form: 'good' | 'fair' | 'poor'
  confidence: number
  duration: number
}

const POSE_TRACKER_API_KEY = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
const POSE_API_ENDPOINT = "https://api.posetracker.ai/v1/analyze"

export default function PoseTracker({
  exercise,
  isTracking,
  onTrackingStart,
  onTrackingStop,
  onDataReceived,
}: PoseTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const websocketRef = useRef<WebSocket | null>(null)
  
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt">("prompt")
  const [apiConnected, setApiConnected] = useState(false)
  const [poseData, setPoseData] = useState<PoseData | null>(null)
  const [metrics, setMetrics] = useState<ExerciseMetrics>({
    repCount: 0,
    form: 'good',
    confidence: 0,
    duration: 0
  })

  // Check if running in iframe
  const isInIframe = window !== window.parent

  const drawPose = useCallback((poses: PoseData) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    
    if (!canvas || !video || !poses.keypoints) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw keypoints
    ctx.fillStyle = '#00ff00'
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2

    poses.keypoints.forEach((keypoint) => {
      if (keypoint.confidence > 0.5) {
        // Scale coordinates to canvas size
        const x = keypoint.x * canvas.width
        const y = keypoint.y * canvas.height
        
        // Draw keypoint
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      }
    })

    // Draw skeleton connections
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['right_shoulder', 'right_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'],
      ['right_hip', 'right_knee'],
      ['left_knee', 'left_ankle'],
      ['right_knee', 'right_ankle']
    ]

    connections.forEach(([point1, point2]) => {
      const kp1 = poses.keypoints.find(kp => kp.name === point1)
      const kp2 = poses.keypoints.find(kp => kp.name === point2)
      
      if (kp1 && kp2 && kp1.confidence > 0.5 && kp2.confidence > 0.5) {
        ctx.beginPath()
        ctx.moveTo(kp1.x * canvas.width, kp1.y * canvas.height)
        ctx.lineTo(kp2.x * canvas.width, kp2.y * canvas.height)
        ctx.stroke()
      }
    })
  }, [])

  const analyzeExerciseForm = useCallback((poses: PoseData) => {
    if (!poses.keypoints) return

    // Simple rep counting logic (this would be more sophisticated in a real app)
    const leftShoulder = poses.keypoints.find(kp => kp.name === 'left_shoulder')
    const leftElbow = poses.keypoints.find(kp => kp.name === 'left_elbow')
    const leftWrist = poses.keypoints.find(kp => kp.name === 'left_wrist')

    if (leftShoulder && leftElbow && leftWrist) {
      // Calculate arm angle for exercises like bicep curls
      const angle = Math.atan2(leftWrist.y - leftElbow.y, leftWrist.x - leftElbow.x) * 180 / Math.PI
      
      // Basic form analysis
      let form: 'good' | 'fair' | 'poor' = 'good'
      if (Math.abs(angle) > 45) form = 'fair'
      if (Math.abs(angle) > 90) form = 'poor'

      setMetrics(prev => ({
        ...prev,
        form,
        confidence: poses.score,
        duration: prev.duration + 1
      }))
    }
  }, [])

  const connectWebSocket = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) return

    try {
     // If your API key is stored in a variable
const apiKey = "7b9de93b-3000-4201-9d61-1bcabc5a74b2";
websocketRef.current = new WebSocket(`wss://api.posetracker.ai/ws?key=${apiKey}`);
 
      websocketRef.current.onopen = () => {
        console.log('[PoseTracker] WebSocket connected')
        setApiConnected(true)
        setError(null)
      }

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.poses && data.poses.length > 0) {
            const pose = data.poses[0]
            setPoseData(pose)
            drawPose(pose)
            analyzeExerciseForm(pose)
            onDataReceived(data)
          }
        } catch (err) {
          console.error('[PoseTracker] Error parsing WebSocket data:', err)
        }
      }

      websocketRef.current.onerror = (error) => {
        console.error('[PoseTracker] WebSocket error:', error)
        setApiConnected(false)
        setError('Failed to connect to pose tracking service')
      }

      websocketRef.current.onclose = () => {
        console.log('[PoseTracker] WebSocket disconnected')
        setApiConnected(false)
      }
    } catch (err) {
      console.error('[PoseTracker] Failed to create WebSocket:', err)
      setError('Failed to initialize pose tracking connection')
    }
  }, [drawPose, analyzeExerciseForm, onDataReceived])

  const sendFrameForAnalysis = useCallback(async () => {
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    
    if (!video || !isTracking || !apiConnected) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0)
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    
    try {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: 'frame',
          exercise: exercise,
          image: imageData,
          timestamp: Date.now()
        }))
      } else {
        // Fallback to REST API
        const response = await fetch(POSE_API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${POSE_TRACKER_API_KEY}`
          },
          body: JSON.stringify({
            exercise: exercise,
            image: imageData.split(',')[1], // Remove data:image/jpeg;base64, prefix
            timestamp: Date.now()
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.poses && data.poses.length > 0) {
            const pose = data.poses[0]
            setPoseData(pose)
            drawPose(pose)
            analyzeExerciseForm(pose)
            onDataReceived(data)
          }
        }
      }
    } catch (err) {
      console.error('[PoseTracker] Error sending frame:', err)
    }

    // Continue analyzing if tracking is active
    if (isTracking) {
      animationFrameRef.current = requestAnimationFrame(sendFrameForAnalysis)
    }
  }, [isTracking, apiConnected, exercise, drawPose, analyzeExerciseForm, onDataReceived])

  const initializeCamera = async () => {
    try {
      setError(null)
      console.log("[PoseTracker] Initializing camera...")

      // Check if we're in an iframe and handle accordingly
      if (isInIframe) {
        console.log("[PoseTracker] Running in iframe, checking permissions...")
      }

      // Enhanced camera constraints
      const constraints = {
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("[PoseTracker] Media stream obtained:", mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          console.log("[PoseTracker] Video metadata loaded")
          videoRef.current?.play().catch(err => {
            console.error("[PoseTracker] Error playing video:", err)
            setError("Failed to start video playback")
          })
        }
        
        videoRef.current.onloadeddata = () => {
          // Set canvas size to match video
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth
            canvasRef.current.height = videoRef.current.videoHeight
          }
        }
      }

      setStream(mediaStream)
      setIsConnected(true)
      setCameraPermission("granted")

      // Connect to pose tracking service
      connectWebSocket()

      console.log(`[PoseTracker] Camera connected successfully with API Key: ${POSE_TRACKER_API_KEY}`)
    } catch (err: any) {
      console.error("[PoseTracker] Camera access error:", err)
      setCameraPermission("denied")
      
      let errorMessage = "Failed to access camera."
      
      if (err.name === "NotAllowedError") {
        errorMessage = isInIframe 
          ? "Camera access denied. Please allow camera permissions in your browser and ensure the parent page allows camera access in iframes."
          : "Camera access denied. Please allow camera permissions and refresh the page."
      } else if (err.name === "NotFoundError") {
        errorMessage = "No camera found. Please ensure a camera is connected to your device."
      } else if (err.name === "NotSupportedError") {
        errorMessage = "Camera not supported in this browser or environment."
      } else if (err.name === "OverconstrainedError") {
        errorMessage = "Camera constraints could not be satisfied. Trying with default settings..."
        // Retry with basic constraints
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ video: true })
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream
            videoRef.current.play()
          }
          setStream(basicStream)
          setIsConnected(true)
          setCameraPermission("granted")
          return
        } catch (retryErr) {
          console.error("[PoseTracker] Retry failed:", retryErr)
        }
      }
      
      setError(errorMessage)
    }
  }

  // Cleanup function
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (websocketRef.current) {
        websocketRef.current.close()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [stream])

  useEffect(() => {
    initializeCamera()
  }, [])

  useEffect(() => {
    if (isTracking && isConnected && apiConnected) {
      sendFrameForAnalysis()
    } else if (!isTracking && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isTracking, isConnected, apiConnected, sendFrameForAnalysis])

  const handleStartTracking = async () => {
    if (!isConnected) {
      await initializeCamera()
      return
    }

    if (!apiConnected) {
      connectWebSocket()
      // Wait a moment for connection
      setTimeout(() => {
        if (apiConnected) {
          console.log("[PoseTracker] Starting pose tracking for:", exercise)
          setMetrics({ repCount: 0, form: 'good', confidence: 0, duration: 0 })
          onTrackingStart()
        } else {
          setError("Unable to connect to pose tracking service. Please try again.")
        }
      }, 1000)
    } else {
      console.log("[PoseTracker] Starting pose tracking for:", exercise)
      setMetrics({ repCount: 0, form: 'good', confidence: 0, duration: 0 })
      onTrackingStart()
    }
  }

  const handleStopTracking = () => {
    console.log("[PoseTracker] Stopping pose tracking")
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    onTrackingStop()
  }

  if (error) {
    return (
      <Card className="aspect-video flex items-center justify-center bg-destructive/10 border-destructive/20">
        <div className="text-center space-y-4 p-6">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <div>
            <p className="font-medium text-destructive">Camera Error</p>
            <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            {isInIframe && (
              <p className="text-xs text-muted-foreground mt-2 max-w-md">
                Running in iframe - ensure parent page allows camera access
              </p>
            )}
          </div>
          <Button variant="outline" onClick={initializeCamera}>
            Retry Camera Access
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-primary" />
                <span className="text-primary">Camera Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Connecting to camera...</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {apiConnected ? (
              <>
                <Activity className="w-4 h-4 text-green-500" />
                <span className="text-green-500">API Connected</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">API Disconnected</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isTracking ? "bg-red-500 animate-pulse" : "bg-gray-400"}`} />
          <span className={isTracking ? "text-red-500" : "text-muted-foreground"}>
            {isTracking ? "Analyzing" : "Ready"}
          </span>
        </div>
      </div>

      {/* Exercise Metrics */}
      {isTracking && (
        <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{metrics.repCount}</div>
            <div className="text-xs text-muted-foreground">Reps</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              metrics.form === 'good' ? 'text-green-500' : 
              metrics.form === 'fair' ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {metrics.form.toUpperCase()}
            </div>
            <div className="text-xs text-muted-foreground">Form</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {Math.round(metrics.confidence * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500">
              {Math.floor(metrics.duration / 60)}:{(metrics.duration % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
        </div>
      )}

      {/* Camera Feed */}
      <Card className="overflow-hidden">
        <div className="aspect-video relative bg-black">
          {isConnected ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                style={{
                  transform: "scaleX(-1)", // Mirror the video for better UX
                }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ 
                  mixBlendMode: "screen",
                  transform: "scaleX(-1)" // Mirror the canvas too
                }}
              />
              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs">
                {exercise} | API: {POSE_TRACKER_API_KEY.slice(0, 8)}...
              </div>
              {isInIframe && (
                <div className="absolute top-4 left-4 bg-blue-500/70 text-white px-2 py-1 rounded text-xs">
                  iframe mode
                </div>
              )}
              {poseData && (
                <div className="absolute top-4 right-4 bg-green-500/70 text-white px-2 py-1 rounded text-xs">
                  Pose Detected ({Math.round(poseData.score * 100)}%)
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <div>
                  <p className="font-medium">Accessing Camera</p>
                  <p className="text-sm text-muted-foreground">
                    {isInIframe ? "Please allow camera permissions in iframe" : "Please allow camera permissions"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-2">
        {!isTracking ? (
          <Button 
            onClick={handleStartTracking} 
            disabled={!isConnected} 
            className="flex-1"
          >
            <Camera className="w-4 h-4 mr-2" />
            Start Analysis
          </Button>
        ) : (
          <Button onClick={handleStopTracking} variant="destructive" className="flex-1">
            Stop Analysis
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={initializeCamera}
          disabled={isConnected}
          className="px-4"
        >
          <Users className="w-4 h-4" />
        </Button>
      </div>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Debug Info</summary>
          <pre className="mt-2 p-2 bg-muted/30 rounded text-xs overflow-auto">
            {JSON.stringify({
              isConnected,
              apiConnected,
              isTracking,
              isInIframe,
              cameraPermission,
              exercise,
              poseDetected: !!poseData,
              metrics
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
