// Video tile that attaches a MediaStream to a video element.
// Shows a name label and active border for the current speaker.

"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export default function VideoTile({
  stream,
  audioStream,
  label,
  small,
  active,
  mirrored = false,
}: {
  stream?: MediaStream
  audioStream?: MediaStream
  label: string
  small?: boolean
  active?: boolean
  mirrored?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream])

  useEffect(() => {
    if (audioRef.current && audioStream) {
      audioRef.current.srcObject = audioStream
      audioRef.current.play().catch(() => {})
    }
  }, [audioStream])

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border bg-black",
        active ? "ring-2 ring-primary" : "",
        small ? "aspect-video" : "aspect-video h-full",
      )}
    >
      <video
        ref={videoRef}
        className={cn("h-full w-full object-cover", mirrored ? "scale-x-[-1]" : "")}
        muted={!audioStream}
        playsInline
      />
      {audioStream && <audio ref={audioRef} hidden autoPlay />}
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">{label}</div>
    </div>
  )
}
