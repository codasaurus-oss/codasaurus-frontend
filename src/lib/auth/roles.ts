import type { Role } from "@/lib/api/schemas"

// Mirrors the backend rank (src/api/rbac.rs): owner > maintainer > viewer.
const roleRank: Record<Role, number> = {
  viewer: 1,
  maintainer: 2,
  owner: 3,
}

// Setup endpoints fall back to owner-only once the first owner exists.
const requiredRank = {
  review: roleRank.viewer,
  maintain: roleRank.maintainer,
  setup: roleRank.owner,
  owner: roleRank.owner,
} as const

type Action = keyof typeof requiredRank

function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) {
    return false
  }
  return roleRank[role] >= requiredRank[action]
}

export { can }
export type { Action }
