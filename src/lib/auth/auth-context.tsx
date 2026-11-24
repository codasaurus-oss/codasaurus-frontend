import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { apiFetch } from "@/lib/api/client"
import { meResponseSchema, type UserInfo } from "@/lib/api/schemas"

type AuthStatus = "loading" | "authenticated" | "anonymous"

type AuthContextValue = {
  user: UserInfo | null
  status: AuthStatus
  refresh: () => Promise<void>
  setUser: (user: UserInfo | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserInfo | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")

  const setUser = useCallback((next: UserInfo | null) => {
    setUserState(next)
    setStatus(next ? "authenticated" : "anonymous")
  }, [])

  const refresh = useCallback(async () => {
    try {
      const me = await apiFetch("/api/auth/me", undefined, meResponseSchema)
      setUser(me.authenticated ? me.user : null)
    } catch {
      // A failed probe means no usable session; the guard sends the user to login.
      setUser(null)
    }
  }, [setUser])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ user, status, refresh, setUser }),
    [user, status, refresh, setUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export { AuthProvider, useAuth }
export type { AuthStatus }
