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
import { Separator } from "@/components/ui/separator"
import { StepCard } from "@/features/setup/step-card"
import { databaseStep, type SetupStepProps } from "@/features/setup/steps"
import { apiFetch } from "@/lib/api/client"
import {
  databaseStatusSchema,
  publicUrlSchema,
  setupResultSchema,
} from "@/lib/api/schemas"

function DatabaseStep({ complete, onComplete }: SetupStepProps) {
  const database = useQuery({
    queryKey: ["setup", "database"],
    queryFn: () =>
      apiFetch("/api/setup/database", undefined, databaseStatusSchema),
  })
  const publicUrl = useQuery({
    queryKey: ["setup", "public-url"],
    queryFn: () =>
      apiFetch("/api/setup/public-url", undefined, publicUrlSchema),
  })
  const [databaseUrl, setDatabaseUrl] = useState("")
  const [draftUrl, setDraftUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<"database" | "url" | null>(null)

  async function saveDatabase() {
    setBusy("database")
    setError(null)
    setMessage(null)
    try {
      const result = await apiFetch(
        "/api/setup/database",
        {
          method: "POST",
          body: JSON.stringify({
            provider: "postgres",
            url: databaseUrl.trim(),
          }),
        },
        setupResultSchema
      )
      setMessage(result.message ?? "Database verified")
      await database.refetch()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not verify the database."
      )
    } finally {
      setBusy(null)
    }
  }

  async function savePublicUrl() {
    setBusy("url")
    setError(null)
    setMessage(null)
    try {
      const result = await apiFetch(
        "/api/setup/public-url",
        {
          method: "POST",
          body: JSON.stringify({ url: publicUrlValue.trim() }),
        },
        setupResultSchema
      )
      setDraftUrl(publicUrlValue.trim())
      setMessage(result.message ?? "Public URL saved")
      await publicUrl.refetch()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save the public URL."
      )
    } finally {
      setBusy(null)
    }
  }

  const publicUrlValue = draftUrl ?? publicUrl.data?.url ?? ""
  const status = database.data

  return (
    <StepCard step={databaseStep} complete={complete}>
      {status ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Host</dt>
          <dd className="font-medium">{status.host}</dd>
          <dt className="text-muted-foreground">Database</dt>
          <dd className="font-medium">{status.database}</dd>
          <dt className="text-muted-foreground">Version</dt>
          <dd className="font-medium">{status.server_version}</dd>
        </dl>
      ) : database.isPending ? (
        <p className="text-sm text-muted-foreground">Checking the database…</p>
      ) : null}
      {database.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Database unavailable</AlertTitle>
          <AlertDescription>{database.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="setup-database-url">
            Connection URL (optional)
          </FieldLabel>
          <Input
            id="setup-database-url"
            placeholder="postgres://user:password@host:5432/codasaurus"
            value={databaseUrl}
            onChange={(event) => setDatabaseUrl(event.target.value)}
          />
          <FieldDescription>
            The URL is only tested, never stored. The server always reads
            DATABASE_URL from its environment.
          </FieldDescription>
        </Field>
        {status?.hint ? <FieldDescription>{status.hint}</FieldDescription> : null}
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => void saveDatabase()}
          disabled={busy !== null}
        >
          {busy === "database" ? "Testing…" : "Test connection"}
        </Button>
        <Button onClick={onComplete}>Continue</Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">Public URL</span>
          {publicUrl.data ? (
            <Badge variant="secondary">Source: {publicUrl.data.source}</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Used for the GitHub webhook and callback URLs.
        </p>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="setup-public-url">Public URL</FieldLabel>
          <Input
            id="setup-public-url"
            placeholder="https://codasaurus.example.com"
            value={publicUrlValue}
            onChange={(event) => setDraftUrl(event.target.value)}
          />
        </Field>
      </FieldGroup>
      {publicUrl.data?.localhost ? (
        <Alert>
          <AlertTitle>Localhost URL</AlertTitle>
          <AlertDescription>
            GitHub cannot reach a localhost URL. Webhooks need a public HTTPS
            origin, such as a deployed host or a tunnel.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => void savePublicUrl()}
          disabled={busy !== null || publicUrlValue.trim() === ""}
        >
          {busy === "url" ? "Saving…" : "Save public URL"}
        </Button>
      </div>

      {message ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Setup step failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </StepCard>
  )
}

export { DatabaseStep }
