import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { SetupStep } from "@/features/setup/steps"

type StepCardProps = {
  step: SetupStep
  complete: boolean
  children: ReactNode
}

function StepCard({ step, complete, children }: StepCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {step.title}
          <Badge variant={complete ? "secondary" : "outline"}>
            {complete ? "Done" : "Required"}
          </Badge>
        </CardTitle>
        <CardDescription>{step.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

export { StepCard }
export type { StepCardProps }
