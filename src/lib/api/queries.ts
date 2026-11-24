import { queryOptions } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api/client"
import {
  healthResponseSchema,
  inviteInfoSchema,
  oidcStatusSchema,
  repoListSchema,
  repoSchema,
  reviewDetailSchema,
  reviewsResponseSchema,
  setupStatusSchema,
  statsSchema,
} from "@/lib/api/schemas"

type ReviewFilters = {
  repoId?: number
  status?: string
  limit?: number
  offset?: number
}

const queryKeys = {
  me: ["me"] as const,
  health: ["health"] as const,
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

const inviteQueryOptions = (token: string) =>
  queryOptions({
    queryKey: queryKeys.invite(token),
    queryFn: () =>
      apiFetch(`/api/auth/invite/${token}`, undefined, inviteInfoSchema),
    enabled: Boolean(token),
    retry: false,
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

const reposQueryOptions = queryOptions({
  queryKey: queryKeys.repos,
  queryFn: () => apiFetch("/api/repos", undefined, repoListSchema),
  staleTime: 30_000,
})

const repoQueryOptions = (id: number) =>
  queryOptions({
    queryKey: queryKeys.repo(id),
    queryFn: () => apiFetch(`/api/repos/${id}`, undefined, repoSchema),
  })

const reviewsQueryOptions = (filters: ReviewFilters) =>
  queryOptions({
    queryKey: queryKeys.reviewList(filters),
    queryFn: () => {
      const params = new URLSearchParams()
      params.set("limit", String(filters.limit ?? 20))
      params.set("offset", String(filters.offset ?? 0))
      if (filters.repoId !== undefined) {
        params.set("repo_id", String(filters.repoId))
      }
      if (filters.status) {
        params.set("status", filters.status)
      }
      return apiFetch(
        `/api/reviews?${params.toString()}`,
        undefined,
        reviewsResponseSchema
      )
    },
  })

const reviewQueryOptions = (id: number) =>
  queryOptions({
    queryKey: queryKeys.review(id),
    queryFn: () => apiFetch(`/api/reviews/${id}`, undefined, reviewDetailSchema),
    refetchInterval: (query) => {
      const status = query.state.data?.review.status
      return status === "pending" || status === "running" ? 10_000 : false
    },
  })

const healthQueryOptions = queryOptions({
  queryKey: queryKeys.health,
  queryFn: () => apiFetch("/health", undefined, healthResponseSchema),
  staleTime: 30_000,
  refetchInterval: 30_000,
})

export {
  healthQueryOptions,
  inviteQueryOptions,
  oidcStatusQueryOptions,
  queryKeys,
  repoQueryOptions,
  reposQueryOptions,
  reviewQueryOptions,
  reviewsQueryOptions,
  setupStatusQueryOptions,
  statsQueryOptions,
}
export type { ReviewFilters }
