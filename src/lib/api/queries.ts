import { queryOptions } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api/client"
import { oidcStatusSchema, setupStatusSchema, statsSchema } from "@/lib/api/schemas"

type ReviewFilters = {
  repoId?: number
  status?: string
  limit?: number
  offset?: number
}

const queryKeys = {
  me: ["me"] as const,
  oidcStatus: ["auth", "oidc-status"] as const,
  invite: (token: string) => ["invites", "detail", token] as const,
  setupStatus: ["setup", "status"] as const,
  stats: ["stats"] as const,
  repos: ["repos"] as const,
  repo: (id: number) => ["repos", "detail", id] as const,
  reviews: ["reviews"] as const,
  review: (id: number) => ["reviews", "detail", id] as const,
  reviewFindings: (id: number) => ["reviews", "findings", id] as const,
  reviewList: (filters: ReviewFilters) => ["reviews", "list", filters] as const,
  users: ["users"] as const,
  invites: ["invites"] as const,
  audit: ["audit"] as const,
  auditList: (filters: { eventType?: string; limit?: number; offset?: number }) =>
    ["audit", "list", filters] as const,
  learningRules: ["learning", "rules"] as const,
  mcpServers: ["mcp", "servers"] as const,
  settings: ["settings"] as const,
}

const oidcStatusQueryOptions = queryOptions({
  queryKey: queryKeys.oidcStatus,
  queryFn: () => apiFetch("/api/auth/oidc/status", undefined, oidcStatusSchema),
  staleTime: 300_000,
})

const setupStatusQueryOptions = queryOptions({
  queryKey: queryKeys.setupStatus,
  queryFn: () => apiFetch("/api/setup/status", undefined, setupStatusSchema),
  staleTime: 30_000,
})

const statsQueryOptions = queryOptions({
  queryKey: queryKeys.stats,
  queryFn: () => apiFetch("/api/stats", undefined, statsSchema),
  staleTime: 30_000,
  refetchInterval: 30_000,
})

export {
  oidcStatusQueryOptions,
  queryKeys,
  setupStatusQueryOptions,
  statsQueryOptions,
}
export type { ReviewFilters }
