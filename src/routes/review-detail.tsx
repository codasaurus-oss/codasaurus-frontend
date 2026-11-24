import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { LoadingState } from "@/components/common/loading-state"
import { StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FindingsByFile } from "@/features/reviews/findings-by-file"
import { apiFetch } from "@/lib/api/client"
import { queryKeys, reviewQueryOptions } from "@/lib/api/queries"
import type { Finding } from "@/lib/api/schemas"
import { useAuth } from "@/lib/auth/auth-context"
import { can } from "@/lib/auth/roles"

function statusTone(status: string) {
  if (status === "passed") {
    return "success"
  }
  if (status === "failed" || status === "error") {
    return "destructive"
  }
  if (status === "running") {
    return "warning"
  }
  return "default"
}

function formatDuration(seconds: number | null) {
  return seconds === null ? "—" : `${seconds}s`
}

function SummaryCard({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children?: ReactNode
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {children}
      </CardHeader>
    </Card>
  )
}

function Breakdown({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts)
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">None</p>
  }
  return (
    <div className="flex flex-col gap-1">
      {entries.map(([label, count]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-2 text-xs"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular-nums">{count}</span>
        </div>
      ))}
    </div>
  )
}

function ReviewDetailRoute() {
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const reviewQuery = useQuery(reviewQueryOptions(id))
  const [dismissing, setDismissing] = useState(false)

  if (reviewQuery.isPending) {
    return <LoadingState rows={8} />
  }
  if (reviewQuery.isError) {
    return (
      <ErrorState
        error={reviewQuery.error}
        onRetry={() => void reviewQuery.refetch()}
      />
    )
  }

  const { review, findings, summary } = reviewQuery.data
  const repoName = review.repo_full_name || review.repo_name || "—"
  const active = review.status === "pending" || review.status === "running"
  const canDismiss = can(user?.role, "maintain")

  async function dismissFinding(finding: Finding, message: string) {
    setDismissing(true)
    try {
      await apiFetch("/api/reviews/dismiss", {
        method: "POST",
        body: JSON.stringify({
          fingerprint: finding.fingerprint ?? "",
          detector: finding.detector,
          file: finding.file_path,
          pr_number: review.pr_number,
          repo: review.repo_full_name || undefined,
          ...(message.trim() ? { message: message.trim() } : {}),
        }),
      })
      toast.success("Finding dismissed")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.review(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ])
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not dismiss the finding."
      )
    } finally {
      setDismissing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Link
          to="/app/reviews"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Reviews
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-xl font-medium tracking-tight">
              #{review.pr_number} {review.pr_title ?? "Untitled pull request"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{repoName}</span>
              <span>by {review.pr_author ?? "unknown"}</span>
              {review.pr_head_sha ? (
                <code className="font-mono text-xs">{review.pr_head_sha}</code>
              ) : null}
              <StatusBadge
                label={review.status}
                tone={statusTone(review.status)}
              />
            </div>
          </div>
          <Button
            variant="outline"
            render={
              <a
                href={`/api/reviews/${review.id}/sarif`}
                download={`review-${review.id}.sarif`}
              />
            }
          >
            Download SARIF
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Findings"
          value={String(summary.finding_count)}
        >
          <Breakdown counts={summary.by_severity} />
        </SummaryCard>
        <SummaryCard label="Files" value={String(summary.file_count)} />
        <SummaryCard label="Detectors" value={String(Object.keys(summary.by_detector).length)}>
          <Breakdown counts={summary.by_detector} />
        </SummaryCard>
        <SummaryCard
          label="Duration"
          value={formatDuration(summary.duration_secs)}
        />
      </div>

      {active ? (
        <div className="flex items-center gap-2">
          <StatusBadge
            label={review.status === "pending" ? "Queued" : "Running"}
            tone="warning"
          />
          <span className="text-sm text-muted-foreground">
            Review in progress. This page refreshes every 10 seconds.
          </span>
        </div>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-base font-medium">Findings</h2>
        {active ? (
          <Skeleton className="h-32 w-full" />
        ) : findings.length === 0 ? (
          <EmptyState
            title="No findings"
            description="This review completed without any findings."
          />
        ) : (
          <FindingsByFile
            findings={findings}
            canDismiss={canDismiss}
            dismissing={dismissing}
            onDismiss={(finding, message) => {
              void dismissFinding(finding, message)
            }}
          />
        )}
      </section>
    </div>
  )
}

export default ReviewDetailRoute
