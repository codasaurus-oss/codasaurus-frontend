import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Navigate, useNavigate } from "react-router"

import { ErrorState } from "@/components/common/error-state"
import { LoadingState } from "@/components/common/loading-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { AdminStep } from "@/features/setup/steps/admin-step"
import { DatabaseStep } from "@/features/setup/steps/database-step"
import { GithubStep } from "@/features/setup/steps/github-step"
import { LlmStep } from "@/features/setup/steps/llm-step"
import {
  completedCount,
  firstIncompleteStep,
  isStepUnlocked,
  setupSteps,
  type SetupStepId,
} from "@/features/setup/steps"
import { queryKeys, setupStatusQueryOptions } from "@/lib/api/queries"

function SetupRoute() {
  const client = useQueryClient()
  const navigate = useNavigate()
  const setup = useQuery(setupStatusQueryOptions)
  const [selected, setSelected] = useState<SetupStepId | null>(null)

  if (setup.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="w-full max-w-md">
          <LoadingState rows={4} />
        </div>
      </div>
    )
  }
  if (setup.isError) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="w-full max-w-md">
          <ErrorState
            error={setup.error}
            onRetry={() => void setup.refetch()}
          />
        </div>
      </div>
    )
  }

  const status = setup.data
  if (status.complete) {
    return <Navigate to="/app/dashboard" replace />
  }

  const activeId =
    selected && isStepUnlocked(status, selected)
      ? selected
      : firstIncompleteStep(status)

  function refresh() {
    setSelected(null)
    void client.invalidateQueries({ queryKey: queryKeys.setupStatus })
  }

  // Navigate first: invalidating setup status while complete:true is visible
  // would otherwise redirect straight to the dashboard.
  function finish() {
    void navigate("/setup/complete")
    void client.invalidateQueries({ queryKey: queryKeys.setupStatus })
  }

  function activeStep() {
    switch (activeId) {
      case "database":
        return <DatabaseStep complete={status.database} onComplete={refresh} />
      case "llm":
        return <LlmStep complete={status.llm} onComplete={refresh} />
      case "github":
        return (
          <GithubStep
            complete={status.github}
            installUrl={status.github_install_url}
            publicUrl={status.public_url}
            onComplete={refresh}
          />
        )
      case "admin":
        return (
          <AdminStep
            complete={status.admin}
            firstOwner={!status.admin}
            onComplete={finish}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-svh justify-center p-6 md:p-10">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center gap-2 font-medium">
          <img
            src="/codasaurus-logo.svg"
            alt=""
            className="size-7 rounded-lg"
          />
          Codasaurus setup
        </div>

        <Card>
          <CardHeader>
            <CardTitle>First-run setup</CardTitle>
            <CardDescription>
              Finish each step to open the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress
              value={(completedCount(status) / setupSteps.length) * 100}
            >
              <ProgressLabel>Required steps</ProgressLabel>
              <ProgressValue>
                {() => `${completedCount(status)} of ${setupSteps.length}`}
              </ProgressValue>
            </Progress>
            <div className="flex flex-col gap-1">
              {setupSteps.map((step, index) => {
                const complete = status[step.id]
                const unlocked = isStepUnlocked(status, step.id)
                return (
                  <Button
                    key={step.id}
                    variant={activeId === step.id ? "secondary" : "ghost"}
                    className="justify-start"
                    disabled={!unlocked}
                    onClick={() => setSelected(step.id)}
                  >
                    <span className="text-muted-foreground tabular-nums">
                      {index + 1}.
                    </span>
                    {step.title}
                    <Badge
                      className="ml-auto"
                      variant={
                        complete
                          ? "secondary"
                          : unlocked
                            ? "outline"
                            : "ghost"
                      }
                    >
                      {complete ? "Done" : unlocked ? "Required" : "Locked"}
                    </Badge>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {activeStep()}
      </div>
    </div>
  )
}

export default SetupRoute
