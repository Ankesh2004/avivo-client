// Thin wrapper around mediasoup-client + WebSocket signaling.
// This is a minimal scaffold; adapt it to your server's signaling protocol.
// It expects typical flows: get routerRtpCapabilities, create/connect transports, produce/consume, etc.

// IMPORTANT: This code is a starting point and will require aligning message types
// with your backend's signaling protocol. It uses JSON messages over WebSocket.

"use client"

import type { Device as DeviceType } from "mediasoup-client"
import type { Transport, Consumer, Producer } from "mediasoup-client/lib/types"

type Events = {
  connected: () => void
  "peer-joined": (peer: { id: string; displayName: string }) => void
  "peer-left": (peerId: string) => void
  "peer-stream": (peerId: string, kind: "video" | "audio", stream: MediaStream) => void
  "chat-message": (msg: { id: string; from: string; text: string; ts: number }) => void
}

type Listener<K extends keyof Events> = Events[K]

type Options = {
  signalingUrl: string
  roomId: string
  peerId: string
  displayName: string
}

export type SFUClient = ReturnType<typeof createSFUClientInternal>

export async function createSFUClient(opts: Options) {
  const { default: Device } = await import("mediasoup-client")
  return createSFUClientInternal(Device, opts)
}

function createSFUClientInternal(Device: typeof import("mediasoup-client").default, opts: Options) {
  const listeners = new Map<keyof Events, Set<Function>>()
  const on = <K extends keyof Events>(event: K, cb: Listener<K>) => {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(cb as any)
  }
  const emit = <K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) => {
    listeners.get(event)?.forEach((cb) => (cb as any)(...args))
  }

  const ws = new WebSocket(
    `${opts.signalingUrl}?roomId=${encodeURIComponent(opts.roomId)}&peerId=${encodeURIComponent(opts.peerId)}&name=${encodeURIComponent(opts.displayName)}`,
  )
  let device: DeviceType | null = null
  let sendTransport: Transport | null = null
  let recvTransport: Transport | null = null
  let camProducer: Producer | null = null
  let micProducer: Producer | null = null

  const consumers = new Map<string, { audio?: Consumer; video?: Consumer; stream: MediaStream }>() // per peer

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "hello", peerId: opts.peerId, displayName: opts.displayName }))
  })

  ws.addEventListener("message", async (ev) => {
    const msg = safeParse(ev.data)
    if (!msg) return

    switch (msg.type) {
      case "router-rtp-capabilities": {
        device = new Device()
        await device.load({ routerRtpCapabilities: msg.data })
        // Request send transport
        ws.send(JSON.stringify({ type: "create-transport", direction: "send" }))
        ws.send(JSON.stringify({ type: "create-transport", direction: "recv" }))
        break
      }
      case "transport-created": {
        if (!device) return
        const { id, iceParameters, iceCandidates, dtlsParameters, direction } = msg.data
        if (direction === "send") {
          sendTransport = device.createSendTransport({ id, iceParameters, iceCandidates, dtlsParameters })
          wireTransport(sendTransport, "send")
        } else {
          recvTransport = device.createRecvTransport({ id, iceParameters, iceCandidates, dtlsParameters })
          wireTransport(recvTransport, "recv")
        }
        break
      }
      case "new-peer": {
        emit("peer-joined", { id: msg.data.peerId, displayName: msg.data.displayName })
        break
      }
      case "peer-left": {
        const peerId = msg.data.peerId as string
        consumers.delete(peerId)
        emit("peer-left", peerId)
        break
      }
      case "new-consumer": {
        // Server instructs us to consume a track
        if (!recvTransport || !device) return
        const { id, producerId, kind, rtpParameters, peerId } = msg.data
        const consumer: Consumer = await recvTransport.consume({ id, producerId, kind, rtpParameters })
        let entry = consumers.get(peerId)
        if (!entry) {
          entry = { stream: new MediaStream() }
          consumers.set(peerId, entry)
        }
        entry.stream.addTrack(consumer.track)
        if (kind === "audio") entry.audio = consumer
        else entry.video = consumer
        emit("peer-stream", peerId, kind, entry.stream)
        ws.send(JSON.stringify({ type: "consumer-resumed", consumerId: id }))
        break
      }
      case "chat-message": {
        emit("chat-message", msg.data)
        break
      }
      case "ready": {
        emit("connected")
        break
      }
      default:
        // console.log("[v0] unhandled message", msg)
        break
    }
  })

  function wireTransport(transport: Transport, direction: "send" | "recv") {
    transport.on("connect", ({ dtlsParameters }, cb, errb) => {
      ws.send(JSON.stringify({ type: "connect-transport", direction, dtlsParameters }))
      // simplistic: assume success
      cb()
    })
    if (direction === "send") {
      transport.on("produce", ({ kind, rtpParameters }, cb, errb) => {
        // ask server to create producer
        const reqId = crypto.randomUUID()
        const onReply = (event: MessageEvent) => {
          const msg = safeParse(event.data)
          if (msg?.type === "produced" && msg.reqId === reqId) {
            ws.removeEventListener("message", onReply as any)
            cb({ id: msg.data.id })
          }
        }
        ws.addEventListener("message", onReply as any)
        ws.send(JSON.stringify({ type: "produce", reqId, kind, rtpParameters }))
      })
    }
  }

  async function join(localStream: MediaStream, { micOn, camOn }: { micOn: boolean; camOn: boolean }) {
    // Trigger RTP caps handshake
    ws.send(JSON.stringify({ type: "get-router-rtp-capabilities" }))

    // Produce local tracks once sendTransport ready
    const tryProduce = async () => {
      if (!sendTransport) {
        setTimeout(tryProduce, 150)
        return
      }
      if (camOn) {
        const videoTrack = localStream.getVideoTracks()[0]
        if (videoTrack) {
          camProducer = await sendTransport.produce({ track: videoTrack })
        }
      }
      if (micOn) {
        const audioTrack = localStream.getAudioTracks()[0]
        if (audioTrack) {
          micProducer = await sendTransport.produce({ track: audioTrack })
        }
      }
      ws.send(JSON.stringify({ type: "ready" }))
    }
    tryProduce()
  }

  async function enableMic() {
    if (!sendTransport) return
    // replace/produce mic
    // In a real app, manage re-acquiring track; here we assume getUserMedia already granted
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const track = stream.getAudioTracks()[0]
    if (micProducer) await micProducer.replaceTrack({ track })
    else micProducer = await sendTransport.produce({ track })
  }
  async function disableMic() {
    if (micProducer) {
      await micProducer.pause()
      micProducer.track?.stop()
    }
  }
  async function enableCam() {
    if (!sendTransport) return
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    const track = stream.getVideoTracks()[0]
    if (camProducer) await camProducer.replaceTrack({ track })
    else camProducer = await sendTransport.produce({ track })
  }
  async function disableCam() {
    if (camProducer) {
      await camProducer.pause()
      camProducer.track?.stop()
    }
  }

  function sendChat(text: string) {
    ws.send(
      JSON.stringify({
        type: "chat-message",
        data: { id: crypto.randomUUID(), from: opts.displayName, text, ts: Date.now() },
      }),
    )
  }

  function leave() {
    try {
      camProducer?.close()
      micProducer?.close()
      sendTransport?.close()
      recvTransport?.close()
      ws.close()
    } catch {}
  }

  return {
    on,
    join,
    enableMic,
    disableMic,
    enableCam,
    disableCam,
    sendChat,
    leave,
  }
}

function safeParse(data: any) {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}
