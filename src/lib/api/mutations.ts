import type { QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/api/queries"

function invalidate(client: QueryClient, queryKey: readonly unknown[]) {
  return client.invalidateQueries({ queryKey })
}

const invalidateRepos = (client: QueryClient) => invalidate(client, queryKeys.repos)
const invalidateReviews = (client: QueryClient) => invalidate(client, queryKeys.reviews)
const invalidateUsers = (client: QueryClient) => invalidate(client, queryKeys.users)
const invalidateInvites = (client: QueryClient) => invalidate(client, queryKeys.invites)
const invalidateSettings = (client: QueryClient) => invalidate(client, queryKeys.settings)
const invalidateLearningRules = (client: QueryClient) =>
  invalidate(client, queryKeys.learningRules)
const invalidateMcpServers = (client: QueryClient) =>
  invalidate(client, queryKeys.mcpServers)
const invalidateStats = (client: QueryClient) => invalidate(client, queryKeys.stats)

export {
  invalidateInvites,
  invalidateLearningRules,
  invalidateMcpServers,
  invalidateRepos,
  invalidateReviews,
  invalidateSettings,
  invalidateStats,
  invalidateUsers,
}
