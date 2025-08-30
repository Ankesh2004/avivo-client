import type React from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Mic, Video, MessageSquareMore, Users, Settings, Bot, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import ThemeToggle from "@/components/theme-toggle"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[260px_1fr]">
      {/* Sidebar hidden on mobile */}
      <aside className="hidden md:block border-r">
        <Sidebar />
      </aside>

      <div className="flex min-h-dvh flex-col">
        {/* Mobile header shows burger + theme toggle */}
        <header className="md:hidden border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <div className="px-4 py-4 border-b flex items-center justify-between">
                  <Link href="/" className="text-lg font-semibold">
                    Avivo
                  </Link>
                  <ThemeToggle />
                </div>
                <nav className="p-3">
                  <ul className="grid gap-1">
                    <li>
                      <NavLink href="/meet" label="Meet" />
                    </li>
                    <li>
                      <NavLink href="/ai-agents" label="AI Agents" />
                    </li>
                    <li>
                      <NavLink href="/settings" label="Settings" />
                    </li>
                  </ul>
                </nav>
              </SheetContent>
            </Sheet>
            <Link href="/" className="font-semibold">
              Avivo
            </Link>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}

function Sidebar() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4 border-b flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          Avivo
        </Link>
        <ThemeToggle />
      </div>
      <nav className="flex-1 p-3">
        <ul className="flex md:flex-col gap-2">
          <li>
            <NavLink href="/meet" label="Meet" icon={<Users className="h-4 w-4" />} />
          </li>
          <li>
            <NavLink href="/ai-agents" label="AI Agents" icon={<Bot className="h-4 w-4" />} />
          </li>
          <li>
            <NavLink href="/settings" label="Settings" icon={<Settings className="h-4 w-4" />} />
          </li>
        </ul>
      </nav>
      <div className="p-3 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mic className="h-4 w-4" />
          <Video className="h-4 w-4" />
          <MessageSquareMore className="h-4 w-4" />
          <span>Ready</span>
        </div>
      </div>
    </div>
  )
}

function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <div className="px-4 py-4 border-b flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            Avivo
          </Link>
          <ThemeToggle />
        </div>
        <nav className="p-3">
          <ul className="grid gap-1">
            <li>
              <NavLink href="/meet" label="Meet" />
            </li>
            <li>
              <NavLink href="/ai-agents" label="AI Agents" />
            </li>
            <li>
              <NavLink href="/settings" label="Settings" />
            </li>
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground")}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  )
}
