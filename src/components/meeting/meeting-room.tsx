// Main meeting UI: handles local/remote media, active speaker, chat panel.
// NOTE: This is a client-only module that expects a mediasoup signaling server.
// Provide NEXT_PUBLIC_SIGNALING_URL in Project Settings to connect.
// In absence of a server, "demoMode" simulates remote tiles for UI preview.

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Mic, MicOff, Video, VideoOff, MessageSquareMore, Monitor, PhoneOff } from "lucide-react"
import VideoTile from "./video-tile"
import ChatPanel, { type ChatMessage } from "./chat-panel"
import { createSFUClient, type SFUClient } from "./mediasoup-client"

type PeerId = string

type RemotePeer = {
  id: PeerId
  displayName: string
  videoStream?: MediaStream
  audioStream?: MediaStream
  volume?: number // for active speaker heuristic
}

export default function MeetingRoom({ roomId }: { roomId: string }) {
  const [connected, setConnected] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeSpeakerId, setActiveSpeakerId] = useState<PeerId | "local" | null>("local")

  const [demoMode, setDemoMode] = useState(false)
  const localVideoRef = useRef<HTMLVideoElement>(null)

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remotePeers, setRemotePeers] = useState<Map<PeerId, RemotePeer>>(new Map())

  const clientRef = useRef<SFUClient | null>(null)
  const peerIdRef = useRef<string>(() => Math.random().toString(36).slice(2, 10)) as any
  const myPeerId = useMemo(() => peerIdRef.current as string, [])

  // Setup local media
  useEffect(() => {
    let stopped = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (stopped) return
        setLocalStream(stream)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          await localVideoRef.current.play().catch(() => {})
        }
      } catch (err) {
        console.log("[v0] getUserMedia error:", err)
        setDemoMode(true)
      }
    })()
    return () => {
      stopped = true
    }
  }, [])

  // Connect to signaling + mediasoup
  const connect = useCallback(async () => {
    if (demoMode) return
    if (!localStream) return
    const signalUrl = process.env.NEXT_PUBLIC_SIGNALING_URL
    if (!signalUrl) {
      console.log("[v0] No NEXT_PUBLIC_SIGNALING_URL set. Enabling demo mode.")
      setDemoMode(true)
      return
    }

    const client = await createSFUClient({
      signalingUrl: signalUrl,
      roomId,
      peerId: myPeerId,
      displayName: "You",
    })
    clientRef.current = client

    client.on("connected", () => {
      console.log("[v0] Connected to SFU")
      setConnected(true)
    })

    client.on("peer-joined", (peer) => {
      setRemotePeers((prev) => {
        const next = new Map(prev)
        next.set(peer.id, { id: peer.id, displayName: peer.displayName })
        return next
      })
    })

    client.on("peer-left", (peerId: string) => {
      setRemotePeers((prev) => {
        const next = new Map(prev)
        next.delete(peerId)
        return next
      })
    })

    client.on("peer-stream", (peerId: string, kind: "video" | "audio", stream: MediaStream) => {
      setRemotePeers((prev) => {
        const next = new Map(prev)
        const p = next.get(peerId)
        if (!p) return prev
        if (kind === "video") p.videoStream = stream
        else p.audioStream = stream
        next.set(peerId, { ...p })
        return next
      })
    })

    client.on("chat-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
    })

    await client.join(localStream, { micOn, camOn })
  }, [demoMode, localStream, roomId, myPeerId, micOn, camOn])

  useEffect(() => {
    connect()
    return () => {
      clientRef.current?.leave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect])

  // Active speaker detection (simple heuristic based on audio levels)
  useEffect(() => {
    const analyzers = new Map<string, AnalyserNode>()
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    const addTrack = (id: string, stream?: MediaStream) => {
      if (!stream) return
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      analyzers.set(id, analyser)
    }

    if (localStream && micOn) addTrack("local", localStream)
    remotePeers.forEach((p) => addTrack(p.id, p.audioStream))

    let raf = 0
    const data = new Uint8Array(128)
    const tick = () => {
      let maxVol = 0
      let speaker: "local" | string | null = null

      analyzers.forEach((analyser, id) => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        if (avg > maxVol && avg > 10) {
          maxVol = avg
          speaker = id as any
        }
      })

      if (speaker) setActiveSpeakerId(speaker)
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      analyzers.forEach((a) => a.disconnect())
      ctx.close().catch(() => {})
    }
  }, [localStream, micOn, remotePeers])

  // Controls
  const toggleMic = async () => {
    const on = !micOn
    setMicOn(on)
    if (demoMode) {
      localStream?.getAudioTracks().forEach((t) => (t.enabled = on))
      return
    }
    if (on) await clientRef.current?.enableMic()
    else await clientRef.current?.disableMic()
  }

  const toggleCam = async () => {
    const on = !camOn
    setCamOn(on)
    if (demoMode) {
      localStream?.getVideoTracks().forEach((t) => (t.enabled = on))
      return
    }
    if (on) await clientRef.current?.enableCam()
    else await clientRef.current?.disableCam()
  }

  const leave = async () => {
    clientRef.current?.leave()
    window.history.back()
  }

  const sendChat = (text: string) => {
    const msg: ChatMessage = { id: crypto.randomUUID(), from: "You", text, ts: Date.now() }
    setMessages((prev) => [...prev, msg])
    clientRef.current?.sendChat(text)
  }

  // Demo: generate a couple of placeholder remote tiles if demoMode enabled
  useEffect(() => {
    if (!demoMode) return
    const peers: RemotePeer[] = [
      { id: "peer-a", displayName: "Alex" },
      { id: "peer-b", displayName: "Sam" },
      { id: "peer-c", displayName: "Riley" },
    ]
    const timer = setTimeout(() => {
      setRemotePeers(new Map(peers.map((p) => [p.id, p])))
    }, 600)
    return () => clearTimeout(timer)
  }, [demoMode])

  const remoteList = Array.from(remotePeers.values())

  // Layout: big active speaker center, filmstrip grid bottom, controls bottom, chat panel right
  return (
    <div className="h-dvh flex flex-col">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Room</span>
          <span className="font-mono font-medium">{roomId}</span>
          {demoMode && <span className="ml-2 text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">Demo Mode</span>}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {connected ? "Connected" : demoMode ? "Offline Preview" : "Connecting..."}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        <section className="relative bg-muted/20">
          <div className="absolute inset-0 flex flex-col">
            {/* Center stage */}
            <div className="flex-1 p-3">
              <Card className="relative h-full overflow-hidden">
                <div className="absolute inset-0">
                  {/* Active speaker video */}
                  <div className="h-full w-full">
                    {activeSpeakerId === "local" ? (
                      <VideoTile stream={localStream || undefined} label="You" active mirrored />
                    ) : (
                      <ActiveSpeakerView peers={remoteList} activeId={activeSpeakerId || ""} />
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Filmstrip */}
            <div className="p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                <VideoTile
                  stream={localStream || undefined}
                  label="You"
                  mirrored
                  active={activeSpeakerId === "local"}
                  small
                />
                {remoteList.map((p) => (
                  <VideoTile
                    key={p.id}
                    stream={p.videoStream}
                    audioStream={p.audioStream}
                    label={p.displayName}
                    small
                    active={activeSpeakerId === p.id}
                  />
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="p-3 flex items-center justify-center gap-3 border-t bg-background/80">
              <Button variant={micOn ? "default" : "destructive"} onClick={toggleMic}>
                {micOn ? <Mic className="h-4 w-4 mr-2" /> : <MicOff className="h-4 w-4 mr-2" />}
                {micOn ? "Mute" : "Unmute"}
              </Button>
              <Button variant={camOn ? "default" : "secondary"} onClick={toggleCam}>
                {camOn ? <Video className="h-4 w-4 mr-2" /> : <VideoOff className="h-4 w-4 mr-2" />}
                {camOn ? "Stop Video" : "Start Video"}
              </Button>
              <Button variant="outline">
                <Monitor className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" onClick={() => setChatOpen((v) => !v)}>
                <MessageSquareMore className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Button variant="destructive" onClick={leave}>
                <PhoneOff className="h-4 w-4 mr-2" />
                Leave
              </Button>
            </div>
          </div>
        </section>

        {/* Chat panel */}
        <aside className={cn("border-l hidden lg:block")}>
          <ChatPanel open={chatOpen} messages={messages} onSend={sendChat} onOpenChange={setChatOpen} />
        </aside>
      </div>

      {/* Hidden local video element for playback if needed */}
      <video ref={localVideoRef} className="hidden" playsInline muted />
    </div>
  )
}

function ActiveSpeakerView({ peers, activeId }: { peers: RemotePeer[]; activeId: string }) {
  const active = peers.find((p) => p.id === activeId)
  if (!active) {
    return <div className="h-full w-full grid place-items-center text-muted-foreground">Waiting for speaker...</div>
  }
  return <VideoTile stream={active.videoStream} audioStream={active.audioStream} label={active.displayName} active />
}
