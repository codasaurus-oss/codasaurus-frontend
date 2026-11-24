import { useQueryClient } from "@tanstack/react-query"
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
import { Textarea } from "@/components/ui/textarea"
import { StepCard } from "@/features/setup/step-card"
import { githubStep, type SetupStepProps } from "@/features/setup/steps"
import { apiFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/queries"
import { setupResultSchema } from "@/lib/api/schemas"

type GithubStepProps = SetupStepProps & {
  installUrl?: string | null
  publicUrl: string
}

// Mirrors the server's is_local_url (src/api/setup.rs) so the manifest button
// is gated on the same rule that decides the callback URL GitHub receives.
function isLocalUrl(url: string) {
  const lower = url.toLowerCase()
  return (
    lower.startsWith("http://localhost") ||
    lower.startsWith("http://127.") ||
    lower.startsWith("http://[::1]") ||
    lower.includes("://localhost:")
  )
}

function GithubStep({
  complete,
  installUrl,
  publicUrl,
  onComplete,
}: GithubStepProps) {
  const client = useQueryClient()
  const [appId, setAppId] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [slug, setSlug] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const localhost = isLocalUrl(publicUrl)

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
      // Stay on this step: the install link only exists once the credentials
      // are saved, so advancing here would skip the only pre-owner install CTA.
      await client.invalidateQueries({ queryKey: queryKeys.setupStatus })
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
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Public URL</span>
            <code className="font-mono text-xs">{publicUrl}</code>
          </div>
          {localhost ? (
            <Alert>
              <AlertTitle>Localhost URL</AlertTitle>
              <AlertDescription>
                GitHub cannot reach a localhost URL, so it cannot build the app
                manifest. Save a public HTTPS URL in the Database step, or use
                the Manual tab.
              </AlertDescription>
            </Alert>
          ) : null}
          <Button
            disabled={localhost}
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
              <Textarea
                id="setup-github-private-key"
                className="font-mono text-xs"
                rows={6}
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

      {installUrl || complete ? (
        <div className="flex flex-wrap gap-2">
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
          {complete ? <Button onClick={onComplete}>Continue</Button> : null}
        </div>
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
