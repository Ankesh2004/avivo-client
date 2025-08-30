// Landing page (public). Navbar shows Login/Signup when not authenticated; Open App when authenticated.
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ThemeToggle from "@/components/theme-toggle"
import NavActions from "@/components/auth/nav-actions"

export default function LandingPage() {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="border-b">
        <div className="mx-auto w-full max-w-5xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-balance">Avivo</h1>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <NavActions />
          </nav>
        </div>
      </header>

      <section className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 flex flex-col gap-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-semibold text-pretty">Fast, reliable, and secure meetings</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Join high-quality video calls with an SFU architecture powered by mediasoup. Collaborate seamlessly with
              audio/video controls and real-time chat.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/meet">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <li className="p-4 border rounded-lg">
              <h3 className="font-medium">SFU Architecture</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Efficient media routing with mediasoup for large meetings.
              </p>
            </li>
            <li className="p-4 border rounded-lg">
              <h3 className="font-medium">Active Speaker</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Auto-spotlight the current speaker for better focus.
              </p>
            </li>
            <li className="p-4 border rounded-lg">
              <h3 className="font-medium">Real-time Chat</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chat alongside your call to keep everyone aligned.
              </p>
            </li>
          </ul>
        </div>
      </section>
      <footer className="border-t">
        <div className="mx-auto w-full max-w-5xl px-6 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Avivo
        </div>
      </footer>
    </main>
  )
}
