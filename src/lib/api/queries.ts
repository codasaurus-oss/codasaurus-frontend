import { queryOptions } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api/client"
import {
  meResponseSchema,
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

const meQueryOptions = queryOptions({
  queryKey: queryKeys.me,
  queryFn: () => apiFetch("/api/auth/me", undefined, meResponseSchema),
  staleTime: 30_000,
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

const reviewsQueryOptions = (filters: ReviewFilters = {}) =>
  queryOptions({
    queryKey: queryKeys.reviewList(filters),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.repoId !== undefined) {
        params.set("repo_id", String(filters.repoId))
      }
      if (filters.status) {
        params.set("status", filters.status)
      }
      if (filters.limit !== undefined) {
        params.set("limit", String(filters.limit))
      }
      if (filters.offset !== undefined) {
        params.set("offset", String(filters.offset))
      }
      const search = params.toString()
      return apiFetch(
        search ? `/api/reviews?${search}` : "/api/reviews",
        undefined,
        reviewsResponseSchema
      )
    },
    refetchInterval: (query) => {
      const reviews = query.state.data?.reviews ?? []
      return reviews.some(
        (review) => review.status === "pending" || review.status === "running"
      )
        ? 10_000
        : false
    },
  })

export {
  meQueryOptions,
  queryKeys,
  reviewsQueryOptions,
  setupStatusQueryOptions,
  statsQueryOptions,
}
export type { ReviewFilters }
