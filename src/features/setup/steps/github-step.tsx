import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StepCard } from "@/features/setup/step-card"
import { githubStep, type SetupStepProps } from "@/features/setup/steps"
import { apiFetch } from "@/lib/api/client"
import { setupResultSchema } from "@/lib/api/schemas"

type GithubStepProps = SetupStepProps & { installUrl?: string | null }

function GithubStep({ complete, installUrl, onComplete }: GithubStepProps) {
  const [appId, setAppId] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [slug, setSlug] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function saveManual() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const body: Record<string, string> = {
        app_id: appId.trim(),
        private_key: privateKey.trim(),
        webhook_secret: webhookSecret.trim(),
      }
      if (slug.trim()) {
        body.slug = slug.trim()
      }
      const result = await apiFetch(
        "/api/setup/github",
        { method: "POST", body: JSON.stringify(body) },
        setupResultSchema
      )
      setMessage(result.message ?? "GitHub App credentials saved")
      onComplete()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save the GitHub App credentials."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <StepCard step={githubStep} complete={complete}>
      <Tabs defaultValue="manifest">
        <TabsList>
          <TabsTrigger value="manifest">Manifest</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>
        <TabsContent value="manifest" className="flex flex-col gap-4 pt-2">
          <p className="text-sm text-muted-foreground">
            GitHub creates the app from a manifest and returns here when it is
            done. You will leave this page for a moment.
          </p>
          <Button
            onClick={() => {
              window.location.href = "/api/setup/github/manifest-page"
            }}
          >
            Create app with GitHub
          </Button>
        </TabsContent>
        <TabsContent value="manual" className="flex flex-col gap-4 pt-2">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="setup-github-app-id">App ID</FieldLabel>
              <Input
                id="setup-github-app-id"
                value={appId}
                onChange={(event) => setAppId(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="setup-github-private-key">
                Private key
              </FieldLabel>
              <Input
                id="setup-github-private-key"
                value={privateKey}
                onChange={(event) => setPrivateKey(event.target.value)}
              />
              <FieldDescription>
                The PEM private key shown on the GitHub App settings page.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="setup-github-webhook-secret">
                Webhook secret
              </FieldLabel>
              <Input
                id="setup-github-webhook-secret"
                type="password"
                autoComplete="off"
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="setup-github-slug">
                App slug (optional)
              </FieldLabel>
              <Input
                id="setup-github-slug"
                placeholder="codasaurus"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
              <FieldDescription>
                Resolved from GitHub when omitted. It powers the install link.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <Button onClick={() => void saveManual()} disabled={busy}>
            {busy ? "Verifying…" : "Save credentials"}
          </Button>
        </TabsContent>
      </Tabs>

      {installUrl ? (
        <Button
          variant="outline"
          render={
            <a href={installUrl} target="_blank" rel="noreferrer" />
          }
        >
          Install the app on GitHub
        </Button>
      ) : null}

      {message ? (
        <Alert>
          <AlertTitle>GitHub App</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save the GitHub App</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </StepCard>
  )
}

export { GithubStep }
