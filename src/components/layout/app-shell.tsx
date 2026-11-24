import { useQuery } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { StatusBadge } from "@/components/common/status-badge"
import { Header } from "@/components/layout/header"
import { navigation } from "@/components/layout/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { setupStatusQueryOptions } from "@/lib/api/queries"

function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<a href="#/app/dashboard" />}
            >
              <img
                src="/codasaurus-logo.svg"
                alt=""
                className="size-8 rounded-lg"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Codasaurus</span>
                <span className="truncate text-xs text-muted-foreground">
                  Security review
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    render={<a href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

function HealthStrip() {
  const setup = useQuery(setupStatusQueryOptions)
  const rows = [
    {
      label: "Database",
      ok: setup.data?.database,
      okLabel: "Connected",
      offLabel: "Unavailable",
    },
    {
      label: "GitHub App",
      ok: setup.data?.github,
      okLabel: "Connected",
      offLabel: "Not configured",
    },
    {
      label: "LLM",
      ok: setup.data?.llm,
      okLabel: "Configured",
      offLabel: "Not configured",
    },
  ]

  return (
    <footer
      data-slot="health-strip"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground"
    >
      {setup.isError ? (
        <span>Status unavailable</span>
      ) : setup.isPending ? (
        rows.map((row) => (
          <Skeleton key={row.label} className="h-4 w-28" />
        ))
      ) : (
        rows.map((row) => (
          <span key={row.label} className="flex items-center gap-1.5">
            {row.label}
            <StatusBadge
              label={row.ok ? row.okLabel : row.offLabel}
              tone={row.ok ? "success" : "warning"}
            />
          </span>
        ))
      )}
    </footer>
  )
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            {children}
          </div>
          <HealthStrip />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

export { AppShell }
