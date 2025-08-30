// Simple chat panel UI. Uses onSend callback for delivery (via signaling in client).

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type ChatMessage = {
  id: string
  from: string
  text: string
  ts: number
}

export default function ChatPanel({
  open,
  messages,
  onSend,
  onOpenChange,
}: {
  open: boolean
  messages: ChatMessage[]
  onSend: (text: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const [text, setText] = useState("")
  return (
    <div className="h-full flex flex-col">
      <header className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-medium">Chat</h2>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(!open)}>
          Close
        </Button>
      </header>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>}
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {m.from} • {new Date(m.ts).toLocaleTimeString()}
            </span>
            <span className="text-sm">{m.text}</span>
          </div>
        ))}
      </div>
      <footer className="border-t p-3 flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              onSend(text.trim())
              setText("")
            }
          }}
        />
        <Button
          onClick={() => {
            if (!text.trim()) return
            onSend(text.trim())
            setText("")
          }}
        >
          Send
        </Button>
      </footer>
    </div>
  )
}
