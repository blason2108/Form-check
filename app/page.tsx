"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Camera, Square, RotateCcw } from "lucide-react"
import { ExerciseSelector } from "@/components/exercise-selector"
import PoseTracker from "@/components/pose-tracker"

export default function FormCheckPro() {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [poseData, setPoseData] = useState<any>(null)

  const startTracking = () => {
    setIsTracking(true)
    setPoseData(null)
  }

  const stopTracking = () => {
    setIsTracking(false)
  }

  const resetSession = () => {
    setPoseData(null)
    setIsTracking(false)
  }

  const startNewSession = () => {
    setPoseData(null)
    setSelectedExercise(null)
    setIsTracking(false)
  }

  const handlePoseTrackerData = (data: any) => {
    setPoseData(data)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">FormCheck Pro</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Posture Analysis</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Beta v1.0
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ExerciseSelector selectedExercise={selectedExercise} onExerciseSelect={setSelectedExercise} />

            {selectedExercise && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Session Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button onClick={startNewSession} variant="outline" className="flex-1 bg-transparent">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      New Session
                    </Button>
                    <Button onClick={resetSession} variant="outline" size="icon">
                      <Square className="w-4 h-4" />
                    </Button>
                  </div>

                  {poseData && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Pose detected</span>
                        <span className="text-primary font-medium">{Math.round(poseData.score * 100)}% confidence</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Real-time pose tracking active</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  {selectedExercise
                    ? `${selectedExercise.charAt(0).toUpperCase() + selectedExercise.slice(1)} Analysis`
                    : "Camera Feed"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedExercise ? (
                  <div className="space-y-6">
                    <PoseTracker
                      exercise={selectedExercise}
                      isTracking={isTracking}
                      onTrackingStart={startTracking}
                      onTrackingStop={stopTracking}
                      onDataReceived={handlePoseTrackerData}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Activity className="w-16 h-16 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-lg font-medium">Select an Exercise</p>
                        <p className="text-sm text-muted-foreground">
                          Choose from Squat, Push-up, or Plank to get started with AI analysis
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <footer className="border-t border-border bg-card/30 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            © 2025 FormCheck Pro - Professional Fitness Analysis Platform
          </div>
        </div>
      </footer>
    </div>
  )
}
