import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { setUnauthorizedHandler } from '@/lib/api/client'
import { AuthProvider } from '@/lib/auth/auth-context'
import { clearSession } from '@/lib/auth/session'
import { ThemeProvider } from '@/lib/theme/theme-provider'
import { router } from '@/routes/router'

const queryClient = new QueryClient()

setUnauthorizedHandler(() => clearSession(queryClient))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
