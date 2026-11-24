import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { StepCard } from "@/features/setup/step-card"
import { llmStep, type SetupStepProps } from "@/features/setup/steps"
import { apiFetch } from "@/lib/api/client"
import { llmConfigSchema, setupResultSchema } from "@/lib/api/schemas"

function LlmStep({ complete, onComplete }: SetupStepProps) {
  const config = useQuery({
    queryKey: ["setup", "llm"],
    queryFn: () => apiFetch("/api/setup/llm", undefined, llmConfigSchema),
  })
  const [apiKey, setApiKey] = useState("")
  const [draftModel, setDraftModel] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<"litellm" | "disabled" | null>(null)
  const modelValue = draftModel ?? config.data?.model ?? ""

  async function save(provider: "litellm" | "disabled") {
    setBusy(provider)
    setError(null)
    setMessage(null)
    try {
      const body: Record<string, string> = { provider }
      if (provider === "litellm") {
        if (apiKey.trim()) {
          body.api_key = apiKey.trim()
        }
        if (modelValue.trim()) {
          body.model = modelValue.trim()
        }
      }
      const result = await apiFetch(
        "/api/setup/llm?test=true",
        { method: "POST", body: JSON.stringify(body) },
        setupResultSchema
      )
      setMessage(result.message ?? "LLM configuration saved")
      onComplete()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save the LLM setup."
      )
    } finally {
      setBusy(null)
    }
  }

  const storedMask = config.data?.api_key ?? null
  const providers = config.data?.models ?? []

  return (
    <StepCard step={llmStep} complete={complete}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Current provider</span>
        <Badge variant="secondary">
          {config.data?.provider ?? "not configured"}
        </Badge>
        {storedMask ? (
          <Badge variant="outline">Key {storedMask}</Badge>
        ) : null}
      </div>
      {config.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not read the LLM configuration</AlertTitle>
          <AlertDescription>{config.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="setup-llm-key">API key</FieldLabel>
          <Input
            id="setup-llm-key"
            type="password"
            autoComplete="off"
            placeholder={storedMask ?? "sk-…"}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <FieldDescription>
            Leave blank to keep the stored key. It is masked when read back.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="setup-llm-model">Model alias</FieldLabel>
          <Input
            id="setup-llm-model"
            placeholder="e.g. gpt-4o-mini"
            value={modelValue}
            onChange={(event) => setDraftModel(event.target.value)}
          />
          {providers.length > 0 ? (
            <FieldDescription>
              Gateway models: {providers.map((model) => model.name).join(", ")}
            </FieldDescription>
          ) : null}
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void save("litellm")} disabled={busy !== null}>
          {busy === "litellm" ? "Testing…" : "Save and test"}
        </Button>
        <Button
          variant="outline"
          onClick={() => void save("disabled")}
          disabled={busy !== null}
        >
          {busy === "disabled" ? "Saving…" : "Continue without an LLM"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Tier-1 static detectors always run. Without an LLM, Codasaurus skips
        model-backed review findings.
      </p>

      {message ? (
        <Alert>
          <AlertTitle>LLM step</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save the LLM setup</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </StepCard>
  )
}

export { LlmStep }
