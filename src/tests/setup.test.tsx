import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AuthProvider } from "@/lib/auth/auth-context"
import SetupCompleteRoute from "@/routes/setup-complete"
import SetupRoute from "@/routes/setup"

const baseStatus = {
  database: true,
  llm: false,
  github: false,
  admin: false,
  complete: false,
  public_url: "https://codasaurus.example.com",
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  })
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init))
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderSetup(client: QueryClient) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/setup"]}>
        <Routes>
          <Route path="/setup" element={<SetupRoute />} />
          <Route
            path="/setup/complete"
            element={<div>setup complete destination</div>}
          />
          <Route path="/app/dashboard" element={<div>dashboard destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function renderSetupComplete(client: QueryClient) {
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/setup/complete"]}>
          <Routes>
            <Route path="/setup/complete" element={<SetupCompleteRoute />} />
            <Route path="/setup" element={<div>setup destination</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// Both wizard routes mounted together so a completion path is exercised
// end to end instead of against a stub destination.
function renderSetupFlow(client: QueryClient) {
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/setup"]}>
          <Routes>
            <Route path="/setup" element={<SetupRoute />} />
            <Route path="/setup/complete" element={<SetupCompleteRoute />} />
            <Route path="/app/dashboard" element={<div>dashboard destination</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("setup wizard", () => {
  it("shows 1 of 4 and starts on the LLM step", async () => {
    stubFetch((url) => {
      if (url === "/api/setup/status") {
        return jsonResponse(baseStatus)
      }
      if (url === "/api/setup/llm") {
        return jsonResponse({
          provider: null,
          api_key: null,
          model: null,
          models: [],
        })
      }
      return jsonResponse({})
    })
    renderSetup(newClient())

    expect(await screen.findByText("1 of 4")).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Continue without an LLM" })
    ).toBeInTheDocument()
  })

  it("redirects to the dashboard when setup is complete", async () => {
    stubFetch(() =>
      jsonResponse({
        ...baseStatus,
        llm: true,
        github: true,
        admin: true,
        complete: true,
      })
    )
    renderSetup(newClient())

    expect(await screen.findByText("dashboard destination")).toBeInTheDocument()
  })

  it("completes the LLM step when Tier-1 only is chosen", async () => {
    let llmConfigured = false
    const fetchMock = stubFetch((url, init) => {
      if (url === "/api/setup/status") {
        return jsonResponse({ ...baseStatus, llm: llmConfigured })
      }
      if (url.startsWith("/api/setup/llm")) {
        if (init?.method === "POST") {
          llmConfigured = true
          return jsonResponse({
            status: "ok",
            test_passed: true,
            message: "LLM configuration saved and connection verified",
          })
        }
        return jsonResponse({
          provider: null,
          api_key: null,
          model: null,
          models: [],
        })
      }
      return jsonResponse({})
    })
    renderSetup(newClient())

    fireEvent.click(
      await screen.findByRole("button", { name: "Continue without an LLM" })
    )

    expect(await screen.findByText("2 of 4")).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).startsWith("/api/setup/llm") && init?.method === "POST"
    )
    expect(post).toBeDefined()
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ provider: "disabled" })
  })

  it("hides the install CTA when no GitHub install URL is known", async () => {
    stubFetch((url) => {
      if (url === "/api/setup/status") {
        return jsonResponse({
          ...baseStatus,
          llm: true,
          github: true,
          admin: true,
          complete: true,
        })
      }
      return jsonResponse({ authenticated: false, user: null })
    })
    renderSetupComplete(newClient())

    expect(await screen.findByText("Setup complete")).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: "Install the GitHub App" })
    ).toBeNull()
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "#/login"
    )
  })

  it("lands on setup complete after creating the owner", async () => {
    let adminCreated = false
    stubFetch((url) => {
      if (url === "/api/setup/status") {
        return jsonResponse({
          ...baseStatus,
          llm: true,
          github: true,
          admin: adminCreated,
          complete: adminCreated,
        })
      }
      if (url === "/api/setup/admin") {
        adminCreated = true
        return jsonResponse({ status: "ok" })
      }
      return jsonResponse({ authenticated: false, user: null })
    })
    renderSetupFlow(newClient())

    fireEvent.change(await screen.findByLabelText("Email"), {
      target: { value: "owner@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-horse-battery" },
    })
    fireEvent.change(screen.getByLabelText("Bootstrap secret"), {
      target: { value: "bootstrap-secret" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create owner" }))

    expect(await screen.findByText("Setup complete")).toBeInTheDocument()
    expect(screen.queryByText("First-run setup")).toBeNull()
  })

  it("stays on the GitHub step and shows the install link after saving", async () => {
    let saved = false
    const installUrl = "https://github.com/apps/codasaurus/installations/new"
    stubFetch((url, init) => {
      if (url === "/api/setup/status") {
        return jsonResponse({
          ...baseStatus,
          llm: true,
          github: saved,
          github_install_url: saved ? installUrl : null,
        })
      }
      if (url === "/api/setup/github" && init?.method === "POST") {
        saved = true
        return jsonResponse({ status: "ok" })
      }
      return jsonResponse({})
    })
    renderSetup(newClient())

    fireEvent.click(await screen.findByRole("tab", { name: "Manual" }))
    fireEvent.change(await screen.findByLabelText("App ID"), {
      target: { value: "12345" },
    })
    fireEvent.change(screen.getByLabelText("Private key"), {
      target: { value: "-----BEGIN PRIVATE KEY-----" },
    })
    fireEvent.change(screen.getByLabelText("Webhook secret"), {
      target: { value: "hook-secret" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save credentials" }))

    expect(
      await screen.findByRole("link", { name: "Install the app on GitHub" })
    ).toHaveAttribute("href", installUrl)
    expect(screen.getByLabelText("App ID")).toBeInTheDocument()
  })

  it("disables the manifest button when the public URL is localhost", async () => {
    stubFetch((url) => {
      if (url === "/api/setup/status") {
        return jsonResponse({
          ...baseStatus,
          llm: true,
          public_url: "http://localhost:8000",
        })
      }
      return jsonResponse({})
    })
    renderSetup(newClient())

    expect(
      await screen.findByRole("button", { name: "Create app with GitHub" })
    ).toBeDisabled()
  })

  it("redirects to setup when the wizard is still incomplete", async () => {
    stubFetch((url) => {
      if (url === "/api/setup/status") {
        return jsonResponse(baseStatus)
      }
      return jsonResponse({ authenticated: false, user: null })
    })
    renderSetupComplete(newClient())

    expect(await screen.findByText("setup destination")).toBeInTheDocument()
  })

  it("hides repository sync from a viewer", async () => {
    stubFetch((url) => {
      if (url === "/api/setup/status") {
        return jsonResponse({
          ...baseStatus,
          llm: true,
          github: true,
          admin: true,
          complete: true,
        })
      }
      return jsonResponse({
        authenticated: true,
        user: {
          email: "viewer@example.com",
          role: "viewer",
          auth_provider: "local",
          is_bootstrap: false,
        },
      })
    })
    renderSetupComplete(newClient())

    expect(
      await screen.findByRole("link", { name: "Open dashboard" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Sync repositories" })
    ).toBeNull()
  })

  it("keeps the PEM line breaks from the private key field", async () => {
    const pem =
      "-----BEGIN PRIVATE KEY-----\nMIIBVwIBADANBgkqhkiG9w0B\n-----END PRIVATE KEY-----"
    const fetchMock = stubFetch((url, init) => {
      if (url === "/api/setup/status") {
        return jsonResponse({ ...baseStatus, llm: true })
      }
      if (url === "/api/setup/github" && init?.method === "POST") {
        return jsonResponse({ status: "ok" })
      }
      return jsonResponse({})
    })
    renderSetup(newClient())

    fireEvent.click(await screen.findByRole("tab", { name: "Manual" }))
    fireEvent.change(await screen.findByLabelText("App ID"), {
      target: { value: "12345" },
    })
    expect(screen.getByLabelText("Private key").tagName).toBe("TEXTAREA")
    fireEvent.change(screen.getByLabelText("Private key"), {
      target: { value: pem },
    })
    fireEvent.change(screen.getByLabelText("Webhook secret"), {
      target: { value: "webhook-secret" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save credentials" }))

    expect(
      await screen.findByText("GitHub App credentials saved")
    ).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url) === "/api/setup/github" && init?.method === "POST"
    )
    expect(post).toBeDefined()
    expect(JSON.parse(String(post?.[1]?.body)).private_key).toBe(pem)
  })

  it("sends the bootstrap secret when creating the first owner", async () => {
    const fetchMock = stubFetch((url) => {
      if (url === "/api/setup/status") {
        return jsonResponse({
          ...baseStatus,
          llm: true,
          github: true,
          admin: false,
        })
      }
      if (url === "/api/setup/admin") {
        return jsonResponse({ status: "ok" })
      }
      return jsonResponse({})
    })
    renderSetup(newClient())

    fireEvent.change(await screen.findByLabelText("Email"), {
      target: { value: "owner@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-horse-battery" },
    })
    fireEvent.change(screen.getByLabelText("Bootstrap secret"), {
      target: { value: "bootstrap-secret" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create owner" }))

    expect(
      await screen.findByText("setup complete destination")
    ).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(
      ([url]) => String(url) === "/api/setup/admin"
    )
    expect(post).toBeDefined()
    expect(new Headers(post?.[1]?.headers).get("x-bootstrap-secret")).toBe(
      "bootstrap-secret"
    )
  })
})
