"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface Exercise {
  id: string
  name: string
  description: string
  icon: string
  color: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  targetMuscles: string[]
  instructions: string[]
}

const exercises: Exercise[] = [
  {
    id: "squat",
    name: "Squat",
    description: "Analyze your squat form and depth",
    icon: "🏋️",
    color: "bg-primary",
    difficulty: "Beginner",
    targetMuscles: ["Quadriceps", "Glutes", "Hamstrings"],
    instructions: [
      "Stand with feet shoulder-width apart",
      "Lower your body by bending knees and hips",
      "Keep your chest up and back straight",
      "Return to starting position",
    ],
  },
  {
    id: "pushup",
    name: "Push-up",
    description: "Check your push-up alignment and range",
    icon: "💪",
    color: "bg-secondary",
    difficulty: "Intermediate",
    targetMuscles: ["Chest", "Shoulders", "Triceps"],
    instructions: [
      "Start in plank position with hands under shoulders",
      "Lower your body until chest nearly touches floor",
      "Keep your body in straight line",
      "Push back up to starting position",
    ],
  },
  {
    id: "plank",
    name: "Plank",
    description: "Monitor your plank stability and form",
    icon: "🧘",
    color: "bg-accent",
    difficulty: "Beginner",
    targetMuscles: ["Core", "Shoulders", "Glutes"],
    instructions: [
      "Start in push-up position",
      "Lower to forearms, keeping elbows under shoulders",
      "Keep body in straight line from head to heels",
      "Hold position while breathing normally",
    ],
  },
]

interface ExerciseSelectorProps {
  selectedExercise: string | null
  onExerciseSelect: (exerciseId: string) => void
}

export function ExerciseSelector({ selectedExercise, onExerciseSelect }: ExerciseSelectorProps) {
  const selectedExerciseData = exercises.find((ex) => ex.id === selectedExercise)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Exercise</CardTitle>
          <CardDescription>Choose an exercise to analyze your form</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {exercises.map((exercise) => (
            <Button
              key={exercise.id}
              variant={selectedExercise === exercise.id ? "default" : "outline"}
              className="w-full justify-start h-auto p-4"
              onClick={() => onExerciseSelect(exercise.id)}
            >
              <div className="flex items-center gap-3 w-full">
                <div
                  className={`w-12 h-12 rounded-lg ${exercise.color} flex items-center justify-center text-lg flex-shrink-0`}
                >
                  {exercise.icon}
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{exercise.name}</div>
                    <Badge variant="secondary" className="text-xs">
                      {exercise.difficulty}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{exercise.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">{exercise.targetMuscles.join(", ")}</div>
                </div>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {selectedExerciseData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl">{selectedExerciseData.icon}</span>
              {selectedExerciseData.name} Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Target Muscles</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedExerciseData.targetMuscles.map((muscle) => (
                    <Badge key={muscle} variant="outline" className="text-xs">
                      {muscle}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Instructions</h4>
                <ol className="space-y-2">
                  {selectedExerciseData.instructions.map((instruction, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center mt-0.5">
                        {index + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export { exercises }
