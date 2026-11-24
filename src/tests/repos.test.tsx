import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AuthProvider } from "@/lib/auth/auth-context"
import ReposRoute from "@/routes/repos"

const repo = {
  id: 1,
  github_id: 42,
  full_name: "acme/web",
  owner: "acme",
  name: "web",
  default_branch: "main",
  installation_id: 7,
  private: false,
  active: true,
  config_json: '{"max_findings":10}',
  created_at: "2026-11-20T10:00:00Z",
  updated_at: "2026-11-20T10:00:00Z",
}

const installUrl = "https://github.com/apps/codasaurus/installations/new"

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

function stubApi(
  options: {
    role?: string
    repos?: object[]
    installUrl?: string | null
  } = {}
) {
  const rows = options.repos ?? [repo]
  const setup = {
    database: true,
    llm: true,
    github: true,
    admin: true,
    complete: true,
    github_install_url: options.installUrl ?? null,
    public_url: "http://localhost:8000",
  }
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? "GET"
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
      return Promise.resolve(jsonResponse(setup))
    }
    if (url === "/api/repos" && method === "GET") {
      return Promise.resolve(jsonResponse(rows))
    }
    if (url === "/api/repos/sync" && method === "POST") {
      return Promise.resolve(jsonResponse({ status: "ok", synced: 1 }))
    }
    if (url === `/api/repos/${repo.id}` && method === "GET") {
      return Promise.resolve(jsonResponse(repo))
    }
    return Promise.resolve(jsonResponse({ status: "ok" }))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function renderRepos(client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <ReposRoute />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
  return queryClient
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("repositories", () => {
  it("hides sync, edit and delete controls from a viewer", async () => {
    stubApi({ role: "viewer" })
    renderRepos()

    expect(await screen.findByText("acme/web")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sync repos" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "View" }))

    expect(await screen.findByText("Installation")).toBeInTheDocument()
    expect(screen.queryByLabelText("Config JSON")).toBeNull()
    expect(screen.queryByRole("button", { name: "Delete repository" })).toBeNull()
  })

  it("shows sync, edit and delete controls to a maintainer", async () => {
    stubApi({ role: "maintainer" })
    renderRepos()

    expect(await screen.findByText("acme/web")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Sync repos" })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))

    expect(await screen.findByLabelText("Config JSON")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Save changes" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Delete repository" })
    ).toBeInTheDocument()
  })

  it("blocks saving a config that is not a JSON object", async () => {
    const fetchMock = stubApi({ role: "maintainer" })
    renderRepos()

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }))
    const editor = await screen.findByLabelText("Config JSON")

    fireEvent.change(editor, { target: { value: "{not json" } })
    expect(
      await screen.findByText("Config must be valid JSON.")
    ).toBeInTheDocument()

    fireEvent.change(editor, { target: { value: "[]" } })
    expect(
      await screen.findByText("Config must be a JSON object.")
    ).toBeInTheDocument()

    const save = screen.getByRole("button", { name: "Save changes" })
    expect(save).toBeDisabled()
    fireEvent.click(save)

    await waitFor(() => {
      const put = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input) === `/api/repos/${repo.id}` && init?.method === "PUT"
      )
      expect(put).toBeUndefined()
    })
  })

  it("invalidates repos and stats after a sync", async () => {
    const fetchMock = stubApi({ role: "maintainer" })
    const client = renderRepos()
    const invalidate = vi.spyOn(client, "invalidateQueries")

    fireEvent.click(await screen.findByRole("button", { name: "Sync repos" }))

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input) === "/api/repos/sync" && init?.method === "POST"
      )
      expect(post).toBeDefined()
    })

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["repos"] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["stats"] })
    })
  })

  it("deletes only after the confirmation is accepted", async () => {
    const fetchMock = stubApi({ role: "maintainer" })
    renderRepos()

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }))
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete repository" })
    )

    const confirm = await screen.findByRole("button", { name: "Delete" })
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          String(input) === `/api/repos/${repo.id}` && init?.method === "DELETE"
      )
    ).toBe(false)

    fireEvent.click(confirm)

    await waitFor(() => {
      const remove = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input) === `/api/repos/${repo.id}` && init?.method === "DELETE"
      )
      expect(remove).toBeDefined()
    })
  })

  it("offers sync and install in the empty state to a maintainer", async () => {
    stubApi({ role: "maintainer", repos: [], installUrl })
    renderRepos()

    expect(await screen.findByText("No repositories yet")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Sync repos" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Install GitHub App" })
    ).toHaveAttribute("href", installUrl)
  })

  it("offers install but no sync to a viewer when a URL exists", async () => {
    stubApi({ role: "viewer", repos: [], installUrl })
    renderRepos()

    expect(await screen.findByText("No repositories yet")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sync repos" })).toBeNull()
    expect(
      screen.getByRole("link", { name: "Install GitHub App" })
    ).toHaveAttribute("href", installUrl)
  })

  it("hides install and sync from a viewer without an install URL", async () => {
    stubApi({ role: "viewer", repos: [] })
    renderRepos()

    expect(await screen.findByText("No repositories yet")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sync repos" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Install GitHub App" })).toBeNull()
  })
})
