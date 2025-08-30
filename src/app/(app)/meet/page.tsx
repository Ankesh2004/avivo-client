// Meet hub: create a room (random code) or join by code.
// Renders in the (app) layout with sidebar.
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function generateRoomCode() {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${seg()}-${seg()}`
}

export default function MeetPage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState("")

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Meet</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Create a meeting</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Button
              onClick={() => {
                const code = generateRoomCode()
                router.push(`/meet/${code}`)
              }}
            >
              Create Room
            </Button>
            <p className="text-sm text-muted-foreground">Generates a unique room code</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join a meeting</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Input
              placeholder="Enter room code (e.g., ABCD-EFGH)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (!joinCode) return
                // Normalize any spaces
                const code = joinCode.replace(/\s+/g, "")
                if (code) {
                  // Optionally validate pattern (e.g., /^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
                  router.push(`/meet/${code}`)
                }
              }}
            >
              Join
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
