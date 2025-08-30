// Simple settings page placeholder
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="mt-6 grid gap-4 max-w-lg">
        <div className="grid gap-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" placeholder="Your name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="signalUrl">Signaling URL</Label>
          <Input
            id="signalUrl"
            placeholder="wss://your-sfu.example.com/socket (uses NEXT_PUBLIC_SIGNALING_URL by default)"
          />
        </div>
      </div>
    </div>
  )
}
