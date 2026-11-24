import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { ErrorState } from "@/components/common/error-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api/client"
import { queryKeys, repoQueryOptions } from "@/lib/api/queries"
import type { Repo } from "@/lib/api/schemas"

type RepoConfigDialogProps = {
  repoId: number
  canEdit: boolean
  onOpenChange: (open: boolean) => void
}

// The backend stores the config string verbatim, so a non-empty value only has
// to parse to an object; it is never re-serialized on the way back.
function configErrorFor(text: string) {
  if (text.trim() === "") {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return "Config must be valid JSON."
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return "Config must be a JSON object."
  }
  return null
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString()
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  )
}

function RepoEditor({
  repo,
  onDeleted,
}: {
  repo: Repo
  onDeleted: () => void
}) {
  const queryClient = useQueryClient()
  const [configText, setConfigText] = useState(repo.config_json ?? "")
  const [active, setActive] = useState(repo.active)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<unknown>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const configError = useMemo(() => configErrorFor(configText), [configText])

  async function save() {
    if (configError) {
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await apiFetch(`/api/repos/${repo.id}`, {
        method: "PUT",
        body: JSON.stringify({ config_json: configText, active }),
      })
      toast.success("Repository updated")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.repos }),
        queryClient.invalidateQueries({ queryKey: queryKeys.repo(repo.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ])
    } catch (caught) {
      setSaveError(caught)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await apiFetch(`/api/repos/${repo.id}`, { method: "DELETE" })
      toast.success("Repository deleted")
      onDeleted()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.repos }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ])
    } catch (caught) {
      setDeleteError(caught)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Separator />
      <div className="flex flex-col gap-2 px-4">
        <Label htmlFor="repo-config-json">Config JSON</Label>
        <Textarea
          id="repo-config-json"
          aria-label="Config JSON"
          className="min-h-40 font-mono text-xs"
          spellCheck={false}
          value={configText}
          aria-invalid={Boolean(configError)}
          onChange={(event) => setConfigText(event.target.value)}
        />
        {configError ? (
          <p className="text-xs text-destructive">{configError}</p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 px-4">
        <Label htmlFor="repo-active">Active</Label>
        <Switch id="repo-active" checked={active} onCheckedChange={setActive} />
      </div>
      {saveError ? (
        <div className="px-4">
          <ErrorState error={saveError} />
        </div>
      ) : null}
      {deleteError ? (
        <div className="px-4">
          <ErrorState error={deleteError} />
        </div>
      ) : null}
      <SheetFooter>
        <Button
          onClick={() => void save()}
          disabled={saving || Boolean(configError)}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
        >
          Delete repository
        </Button>
      </SheetFooter>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete repository"
        description={`Delete ${repo.full_name} and its local review history? This cannot be undone.`}
        onConfirm={() => void remove()}
        destructive
      />
    </>
  )
}

function RepoConfigDialog({
  repoId,
  canEdit,
  onOpenChange,
}: RepoConfigDialogProps) {
  const repoQuery = useQuery(repoQueryOptions(repoId))
  const repo = repoQuery.data

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false)
        }
      }}
    >
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{repo?.full_name ?? "Repository"}</SheetTitle>
          <SheetDescription>
            Repository details and review configuration.
          </SheetDescription>
        </SheetHeader>

        {repoQuery.isError ? (
          <div className="px-4">
            <ErrorState
              error={repoQuery.error}
              onRetry={() => void repoQuery.refetch()}
            />
          </div>
        ) : !repo ? (
          <div className="flex flex-col gap-2 px-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 overflow-y-auto px-4 text-sm">
              <Detail label="Default branch">
                {repo.default_branch ?? "—"}
              </Detail>
              <Detail label="Visibility">
                <Badge variant={repo.private ? "secondary" : "outline"}>
                  {repo.private ? "Private" : "Public"}
                </Badge>
              </Detail>
              <Detail label="Status">
                <Badge variant={repo.active ? "default" : "outline"}>
                  {repo.active ? "Active" : "Paused"}
                </Badge>
              </Detail>
              <Detail label="Installation">{repo.installation_id}</Detail>
              <Detail label="Updated">{formatWhen(repo.updated_at)}</Detail>
            </div>

            {canEdit ? (
              <RepoEditor
                key={`${repo.id}:${repo.updated_at}`}
                repo={repo}
                onDeleted={() => onOpenChange(false)}
              />
            ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export { RepoConfigDialog }
