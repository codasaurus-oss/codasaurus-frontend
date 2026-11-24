import { useEffect, useState } from "react"
import { MonitorIcon, MoonIcon, SearchIcon, SunIcon, UserIcon } from "lucide-react"

import { navigation } from "@/components/layout/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useTheme, type Theme } from "@/lib/theme/theme-provider"

function Header() {
  const [commandOpen, setCommandOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#/app/dashboard">Codasaurus</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto flex items-center gap-2 px-4">
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground"
          aria-label="Search"
          onClick={() => setCommandOpen(true)}
        >
          <SearchIcon />
          <span className="hidden sm:inline">Search</span>
          <span className="hidden text-xs sm:inline">⌘K</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Theme"
              />
            }
          >
            <UserIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              <DropdownMenuRadioItem value="light">
                <SunIcon />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <MoonIcon />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <MonitorIcon />
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <Command>
          <CommandInput placeholder="Search pages..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {navigation.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.title}
                  onSelect={() => {
                    window.location.hash = item.href
                    setCommandOpen(false)
                  }}
                >
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </header>
  )
}

export { Header }
