import { useQuery, useQueryClient } from "@tanstack/react-query"
import { TriangleAlertIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { ErrorState } from "@/components/common/error-state"
import { LoadingState } from "@/components/common/loading-state"
import { StatusBadge } from "@/components/common/status-badge"
import { PageHeader } from "@/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SettingField } from "@/features/settings/setting-field"
import { ApiError } from "@/lib/api/errors"
import { apiFetch } from "@/lib/api/client"
import {
  githubSettingsQueryOptions,
  queryKeys,
  settingsQueryOptions,
} from "@/lib/api/queries"
import {
  integrationTestSchema,
  settingsActionResultSchema,
  type SettingsMap,
} from "@/lib/api/schemas"
import { useAuth } from "@/lib/auth/auth-context"
import { can } from "@/lib/auth/roles"

type TabId = "general" | "github" | "llm" | "oidc" | "tickets" | "advanced"

type TabMeta = {
  label: string
  description: string
  fields: Array<[key: string, label: string]>
}

// Mirrors ALLOWED_KEYS in the backend settings API; keys absent here are read
// only because PUT /api/settings/{key} rejects anything outside that whitelist.
const TABS: Record<TabId, TabMeta> = {
  general: {
    label: "General",
    description: "Instance identity and the offline kill-switch.",
    fields: [
      ["public_url", "Public URL"],
      ["offline_mode", "Offline mode"],
    ],
  },
  github: {
    label: "GitHub",
    description: "GitHub App registration and connection.",
    fields: [],
  },
  llm: {
    label: "LLM",
    description: "Gateway provider, credential and model aliases.",
    fields: [
      ["llm_provider", "Provider"],
      ["llm_api_key", "API key"],
      ["llm_model", "Model"],
      ["llm_model_cheap", "Cheap model"],
      ["llm_embedding_model", "Embedding model"],
      ["llm_daily_budget_usd", "Daily budget (USD)"],
    ],
  },
  oidc: {
    label: "OIDC",
    description: "Single sign-on through an OpenID Connect provider.",
    fields: [
      ["oidc_issuer", "Issuer URL"],
      ["oidc_client_id", "Client ID"],
      ["oidc_client_secret", "Client secret"],
      ["oidc_redirect_uri", "Redirect URI"],
      ["oidc_scopes", "Scopes"],
      ["oidc_allow_open_join", "Allow open join"],
      ["oidc_allow_unverified_email", "Allow unverified email"],
      ["oidc_allow_public_client", "Allow public client"],
    ],
  },
  tickets: {
    label: "Tickets",
    description: "Jira and Linear credentials for ticket workflows.",
    fields: [
      ["jira_base_url", "Jira base URL"],
      ["jira_email", "Jira email"],
      ["jira_api_token", "Jira API token"],
      ["linear_api_key", "Linear API key"],
    ],
  },
  advanced: {
    label: "Advanced",
    description: "Review policy, detector toggles and runtime limits.",
    fields: [
      ["default_severity", "Default severity"],
      ["review_strictness", "Review strictness"],
      ["max_blocking", "Max blocking findings"],
      ["max_warnings", "Max warnings"],
      ["forbidden_paths", "Forbidden paths"],
      ["request_reviewers", "Request reviewers"],
      ["create_check_run", "Create check run"],
      ["hallucinated_imports_enabled", "Hallucinated imports"],
      ["phantom_deps_enabled", "Phantom dependencies"],
      ["vulnerabilities_enabled", "Vulnerabilities"],
      ["secrets_enabled", "Secrets"],
      ["over_engineering_enabled", "Over-engineering"],
      ["boilerplate_enabled", "Boilerplate"],
      ["todo_leaks_enabled", "TODO leaks"],
      ["stale_api_enabled", "Stale API usage"],
      ["risky_patterns_enabled", "Risky patterns"],
      ["graph_enabled", "Repository graph"],
      ["guidelines_enabled", "Guidelines"],
      ["iac_enabled", "Infrastructure as code"],
      ["auto_labels_enabled", "Auto labels"],
      ["exclude_patterns", "Exclude patterns"],
      ["update_pr_description", "Update PR description"],
      ["custom_instructions", "Custom instructions"],
      ["allow_auto_fix", "Allow auto fix"],
      ["auto_approve", "Auto approve"],
      ["pr_title_fix", "PR title fix"],
      ["audit_retention_days", "Audit retention (days)"],
      ["queue_workers", "Queue workers"],
      ["max_concurrent_reviews", "Max concurrent reviews"],
      ["review_timeout_secs", "Review timeout (seconds)"],
      ["max_inline_comments", "Max inline comments"],
      ["max_reviewer_files", "Max reviewer files"],
      ["max_comment_bytes", "Max comment bytes"],
      ["max_llm_diff_chars", "Max LLM diff characters"],
      ["auto_improve_max_files", "Auto-improve max files"],
      ["auto_improve_max_diff", "Auto-improve max diff"],
      ["hsts", "HSTS"],
      ["metrics_token", "Metrics token"],
      ["secure_cookies", "Secure cookies"],
      ["insecure_cookies", "Insecure cookies"],
    ],
  },
}

const TAB_IDS = Object.keys(TABS) as TabId[]

type Integration = { path: string; label: string }

const INTEGRATIONS: Record<TabId, Integration[]> = {
  general: [],
  github: [{ path: "/api/settings/github/test", label: "GitHub App" }],
  llm: [],
  oidc: [{ path: "/api/settings/oidc/test", label: "OIDC discovery" }],
  tickets: [
    { path: "/api/settings/jira/test", label: "Jira" },
    { path: "/api/settings/linear/test", label: "Linear" },
  ],
  advanced: [],
}

type ClearTarget = {
  path: string
  button: string
  title: string
  description: string
}

const CLEARS: Record<TabId, ClearTarget[]> = {
  general: [],
  github: [
    {
      path: "/api/settings/github",
      button: "Clear GitHub config",
      title: "Clear GitHub App config",
      description:
        "Delete the stored GitHub App credentials and mark every repository inactive? The App stays installed on GitHub.",
    },
  ],
  llm: [],
  oidc: [
    {
      path: "/api/settings/oidc",
      button: "Clear SSO config",
      title: "Clear SSO configuration",
      description:
        "Delete the stored OIDC settings? Owners sign in with email and password afterwards.",
    },
  ],
  tickets: [
    {
      path: "/api/settings/tickets",
      button: "Clear ticket config",
      title: "Clear Jira and Linear",
      description: "Delete the stored Jira and Linear credentials?",
    },
  ],
  advanced: [],
}

type TestState = { status: "running" | "ok" | "error"; message: string }

const FORBIDDEN = new ApiError(
  403,
  "Only workspace owners can manage settings."
)

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  )
}

function OfflineCard({ values }: { values: SettingsMap }) {
  const effective = values.offline_mode_effective === true
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Offline mode</CardTitle>
        <CardDescription>
          Effective kill-switch state, independent of the LLM credential.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <DetailRow label="Effective">
          <StatusBadge
            label={effective ? "On" : "Off"}
            tone={effective ? "warning" : "default"}
          />
        </DetailRow>
        <DetailRow label="Source">
          <span className="font-mono text-xs">
            {values.offline_mode_source ?? "unknown"}
          </span>
        </DetailRow>
        {values.offline_mode_hint ? (
          <p className="text-sm text-muted-foreground">
            {values.offline_mode_hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RegistrationCard() {
  const github = useQuery(githubSettingsQueryOptions)
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>App registration</CardTitle>
        <CardDescription>
          Written by first-run setup; these bind the GitHub App.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {github.isPending ? (
          <Skeleton className="h-4 w-1/2" />
        ) : github.isError ? (
          <ErrorState
            error={github.error}
            onRetry={() => void github.refetch()}
          />
        ) : (
          <>
            <DetailRow label="App ID">{github.data.app_id ?? "—"}</DetailRow>
            <DetailRow label="Name">{github.data.app_name ?? "—"}</DetailRow>
            <DetailRow label="Slug">{github.data.slug ?? "—"}</DetailRow>
            <DetailRow label="Configured">
              <Badge variant={github.data.configured ? "default" : "outline"}>
                {github.data.configured ? "Yes" : "No"}
              </Badge>
            </DetailRow>
          </>
        )}
      </CardContent>
    </Card>
  )
}

type TabBodyProps = {
  tab: TabId
  values: SettingsMap
  tests: Record<string, TestState>
  clearErrors: Record<string, unknown>
  onSaved: (key: string, restartRequired: boolean) => void
  onTest: (integration: Integration) => void
  onClear: (target: ClearTarget) => void
}

function TabBody({
  tab,
  values,
  tests,
  clearErrors,
  onSaved,
  onTest,
  onClear,
}: TabBodyProps) {
  const meta = TABS[tab]
  const integrations = INTEGRATIONS[tab]
  const clears = CLEARS[tab]

  return (
    <div className="flex flex-col gap-4">
      {tab === "general" ? <OfflineCard values={values} /> : null}
      {tab === "github" ? <RegistrationCard /> : null}

      {meta.fields.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{meta.label}</CardTitle>
            <CardDescription>{meta.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {meta.fields.map(([key, label]) => (
                <SettingField
                  key={`${key}:${values[key] ?? ""}`}
                  settingKey={key}
                  label={label}
                  value={values[key]}
                  onSaved={onSaved}
                />
              ))}
            </FieldGroup>
          </CardContent>
        </Card>
      ) : null}

      {integrations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Connection tests</CardTitle>
            <CardDescription>
              Saved credentials are used; unsaved edits are ignored.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {integrations.map((integration) => {
              const state = tests[integration.path]
              return (
                <div key={integration.path} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span>{integration.label}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Test ${integration.label}`}
                      disabled={state?.status === "running"}
                      onClick={() => onTest(integration)}
                    >
                      {state?.status === "running"
                        ? "Testing…"
                        : "Test connection"}
                    </Button>
                  </div>
                  {state?.status === "ok" ? (
                    <Alert>
                      <AlertTitle>Connected</AlertTitle>
                      <AlertDescription>{state.message}</AlertDescription>
                    </Alert>
                  ) : null}
                  {state?.status === "error" ? (
                    <Alert variant="destructive">
                      <AlertTitle>Connection failed</AlertTitle>
                      <AlertDescription>{state.message}</AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {clears.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>
              Removes stored credentials. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {clears.map((target) => (
              <div
                key={target.path}
                className="flex flex-col items-start gap-2"
              >
                <Button
                  variant="destructive"
                  onClick={() => onClear(target)}
                >
                  {target.button}
                </Button>
                {clearErrors[target.path] ? (
                  <ErrorState error={clearErrors[target.path]} />
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function SettingsConsole() {
  const queryClient = useQueryClient()
  const settings = useQuery(settingsQueryOptions)
  const [tab, setTab] = useState<TabId>("general")
  const [restartKeys, setRestartKeys] = useState<string[]>([])
  const [tests, setTests] = useState<Record<string, TestState>>({})
  const [clearing, setClearing] = useState<ClearTarget | null>(null)
  const [clearErrors, setClearErrors] = useState<Record<string, unknown>>({})

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
      queryClient.invalidateQueries({ queryKey: queryKeys.repos }),
      queryClient.invalidateQueries({ queryKey: queryKeys.oidcStatus }),
      queryClient.invalidateQueries({ queryKey: queryKeys.health }),
      queryClient.invalidateQueries({ queryKey: queryKeys.setupStatus }),
    ])
  }

  function handleSaved(key: string, restartRequired: boolean) {
    if (restartRequired) {
      setRestartKeys((previous) =>
        previous.includes(key) ? previous : [...previous, key]
      )
    }
    void refresh()
  }

  async function runTest(integration: Integration) {
    setTests((previous) => ({
      ...previous,
      [integration.path]: { status: "running", message: "" },
    }))
    try {
      const result = await apiFetch(
        integration.path,
        { method: "POST" },
        integrationTestSchema
      )
      setTests((previous) => ({
        ...previous,
        [integration.path]: {
          status: "ok",
          message: result.message ?? "Connected",
        },
      }))
    } catch (caught) {
      setTests((previous) => ({
        ...previous,
        [integration.path]: {
          status: "error",
          message:
            caught instanceof Error ? caught.message : "Connection failed",
        },
      }))
    }
  }

  async function runClear(target: ClearTarget) {
    setClearErrors((previous) => {
      const next = { ...previous }
      delete next[target.path]
      return next
    })
    try {
      const result = await apiFetch(
        target.path,
        { method: "DELETE" },
        settingsActionResultSchema
      )
      toast.success(result.message ?? `${target.button} done`)
      await refresh()
    } catch (caught) {
      setClearErrors((previous) => ({ ...previous, [target.path]: caught }))
    }
  }

  if (settings.isPending) {
    return <LoadingState rows={6} />
  }
  if (settings.isError) {
    return (
      <ErrorState
        error={settings.error}
        onRetry={() => void settings.refetch()}
      />
    )
  }

  const values = settings.data

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Settings"
        description="Owner-only instance configuration."
      />

      {restartKeys.length > 0 ? (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>Restart required</AlertTitle>
          <AlertDescription>
            Saved {restartKeys.join(", ")}. The new value takes effect after the
            server restarts.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)}>
        <TabsList>
          {TAB_IDS.map((id) => (
            <TabsTrigger key={id} value={id}>
              {TABS[id].label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TAB_IDS.map((id) => (
          <TabsContent key={id} value={id}>
            <TabBody
              tab={id}
              values={values}
              tests={tests}
              clearErrors={clearErrors}
              onSaved={handleSaved}
              onTest={(integration) => void runTest(integration)}
              onClear={setClearing}
            />
          </TabsContent>
        ))}
      </Tabs>

      <ConfirmDialog
        open={clearing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setClearing(null)
          }
        }}
        title={clearing?.title ?? ""}
        description={clearing?.description ?? ""}
        onConfirm={() => {
          if (clearing) {
            void runClear(clearing)
          }
        }}
        destructive
      />
    </div>
  )
}

function SettingsRoute() {
  const { user, status } = useAuth()

  if (status === "loading") {
    return <LoadingState rows={6} />
  }
  if (!can(user?.role, "owner")) {
    return <ErrorState error={FORBIDDEN} />
  }
  return <SettingsConsole />
}

export default SettingsRoute
