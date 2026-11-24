import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ErrorState } from "@/components/common/error-state"
import { apiFetch } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import { AuthProvider, useAuth } from "@/lib/auth/auth-context"
import { can } from "@/lib/auth/roles"

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  })
}

function stubMe(role: "owner" | "maintainer" | "viewer") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        authenticated: true,
        user: {
          email: `${role}@example.com`,
          role,
          auth_provider: "local",
          is_bootstrap: false,
        },
      })
    )
  )
}

function OwnerOnlyActions() {
  const { user } = useAuth()

  return (
    <div>
      <span>{user?.email}</span>
      {can(user?.role, "owner") ? <button>Delete user</button> : null}
    </div>
  )
}

function renderOwnerOnlyActions() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <OwnerOnlyActions />
      </AuthProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("auth gating", () => {
  it("hides owner-only actions from a viewer", async () => {
    stubMe("viewer")
    renderOwnerOnlyActions()

    expect(await screen.findByText("viewer@example.com")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Delete user" })).toBeNull()
  })

  it("shows the same action to an owner", async () => {
    stubMe("owner")
    renderOwnerOnlyActions()

    expect(await screen.findByRole("button", { name: "Delete user" })).toBeInTheDocument()
  })

  it("renders ErrorState for a direct 403 instead of blank content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: "Insufficient permissions for this action" },
          { status: 403 }
        )
      )
    )

    const error = await apiFetch("/api/users").catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(403)

    render(<ErrorState error={error} />)

    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    expect(
      screen.getByText("Insufficient permissions for this action")
    ).toBeInTheDocument()
  })
})
