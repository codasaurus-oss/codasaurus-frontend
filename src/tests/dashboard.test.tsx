import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AuthProvider } from "@/lib/auth/auth-context"
import DashboardRoute from "@/routes/dashboard"

const setupStatus = {
  database: true,
  llm: true,
  github: true,
  admin: true,
  complete: true,
  github_install_url: null as string | null,
  public_url: "http://localhost:8000",
}

const stats = {
  total_repos: 3,
  total_reviews_today: 2,
  pass_rate: 84.5,
  total_findings: 12,
  reviews_last_7_days: 5,
  dismissals_last_7_days: 1,
  recent_activity: [
    {
      id: 42,
      repo: "acme/web",
      pr_number: 7,
      pr_title: "Harden auth",
      status: "passed",
      created_at: "2026-11-23T10:00:00Z",
    },
  ],
  trust: {
    dismissals: 1,
    tier1_findings: 12,
    fp_proxy_ratio: 0.083,
    accept_rate: 91.7,
    note: "Proxy metrics.",
  },
  llm: {
    requests: 4,
    prompt_chars: 1000,
    spend_usd_estimate: 0.12,
    spend_usd_last_day: 0.03,
    daily_budget_usd: 5,
    note: "Estimates.",
  },
  analytics: {
    reviews_by_day: [
      { day: "2026-11-22", reviews: 1, findings: 2 },
      { day: "2026-11-23", reviews: 2, findings: 3 },
    ],
    findings_by_detector: [
      { detector: "secrets", concern: "security", count: 3, share_pct: 100 },
    ],
    outcomes_7d: { passed: 2, failed: 1, other: 0 },
  },
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  })
}

function stubApi(options: {
  role?: string
  stats?: object
  setup?: object
}) {
  const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input)
    if (url === "/api/auth/me") {
      return Promise.resolve(
        jsonResponse({
          authenticated: true,
          user: {
            email: `${options.role ?? "owner"}@example.com`,
            role: options.role ?? "owner",
            auth_provider: "local",
            is_bootstrap: false,
          },
        })
      )
    }
    if (url === "/api/setup/status") {
      return Promise.resolve(jsonResponse(options.setup ?? setupStatus))
    }
    if (url === "/api/stats") {
      return Promise.resolve(jsonResponse(options.stats ?? stats))
    }
    return Promise.resolve(jsonResponse({ status: "ok", synced: 1 }))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter>
          <DashboardRoute />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("dashboard", () => {
  it("renders an em dash when pass_rate is null", async () => {
    stubApi({ stats: { ...stats, pass_rate: null } })
    renderDashboard()

    const label = await screen.findByText("Pass rate")
    const card = label.closest('[data-slot="card"]')
    expect(card).not.toBeNull()
    expect(card?.textContent).toContain("—")
    expect(card?.textContent).not.toContain("null")
  })

  it("links recent activity rows to the review detail", async () => {
    stubApi({})
    renderDashboard()

    const link = await screen.findByRole("link", { name: "#7 Harden auth" })
    expect(link).toHaveAttribute("href", "#/app/reviews/42")
  })

  it("shows the empty state with sync and install actions for a maintainer", async () => {
    stubApi({
      role: "maintainer",
      stats: { ...stats, total_repos: 0, total_reviews_today: 0, recent_activity: [] },
      setup: {
        ...setupStatus,
        github_install_url:
          "https://github.com/apps/codasaurus/installations/new",
      },
    })
    renderDashboard()

    expect(await screen.findByText("No reviews yet")).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Sync repos" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Install GitHub App" })
    ).toHaveAttribute(
      "href",
      "https://github.com/apps/codasaurus/installations/new"
    )
  })

  it("posts a sync when the empty-state action is used", async () => {
    const fetchMock = stubApi({
      role: "owner",
      stats: { ...stats, recent_activity: [] },
    })
    renderDashboard()

    fireEvent.click(await screen.findByRole("button", { name: "Sync repos" }))

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input) === "/api/repos/sync" && init?.method === "POST"
      )
      expect(post).toBeDefined()
    })
  })

  it("hides sync from a viewer", async () => {
    stubApi({
      role: "viewer",
      stats: { ...stats, recent_activity: [] },
    })
    renderDashboard()

    expect(await screen.findByText("No reviews yet")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sync repos" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Install GitHub App" })).toBeNull()
  })

  it("renders chart placeholders when analytics arrays are missing", async () => {
    stubApi({ stats: { ...stats, analytics: {} } })
    renderDashboard()

    expect(await screen.findByText("Reviews and findings")).toBeInTheDocument()
    expect(screen.getAllByText("No data yet.")).toHaveLength(3)
  })
})
