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
import { TooltipProvider } from "@/components/ui/tooltip"
import { healthQueryOptions, setupStatusQueryOptions } from "@/lib/api/queries"

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
  const health = useQuery(healthQueryOptions)

  return (
    <footer
      data-slot="health-strip"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground"
    >
      {setup.isError ? (
        <span>Status unavailable</span>
      ) : setup.data ? (
        <>
          <span className="flex items-center gap-1.5">
            Database
            <StatusBadge
              label={setup.data.database ? "Connected" : "Unavailable"}
              tone={setup.data.database ? "success" : "warning"}
            />
          </span>
          <span className="flex items-center gap-1.5">
            GitHub App
            <StatusBadge
              label={setup.data.github ? "Configured" : "Not configured"}
              tone={setup.data.github ? "success" : "warning"}
            />
          </span>
          <span className="flex items-center gap-1.5">
            LLM
            <StatusBadge
              label={setup.data.llm ? "Setup complete" : "Not configured"}
            />
          </span>
          {health.data ? (
            <span className="flex items-center gap-1.5">
              Offline mode
              <StatusBadge
                label={
                  health.data.offline_mode ? "Offline · Tier-1 only" : "Online"
                }
                tone={health.data.offline_mode ? "warning" : "default"}
              />
            </span>
          ) : null}
        </>
      ) : null}
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
