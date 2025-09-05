// video-tile.jsx (FIXED)

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
  muted = false, // Add muted to props, default to false
}: {
  stream?: MediaStream
  audioStream?: MediaStream
  label: string
  small?: boolean
  active?: boolean
  mirrored?: boolean
  muted?: boolean // Add type for muted
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch((err) => console.error("Video play failed", err))
    }
  }, [stream])

  useEffect(() => {
    if (audioRef.current && audioStream) {
      audioRef.current.srcObject = audioStream
      audioRef.current.play().catch((err) => console.error("Audio play failed", err))
    }
  }, [audioStream])

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border bg-black",
        active ? "ring-2 ring-primary" : "",
        small ? "aspect-video" : "aspect-video h-auto", // Use h-auto for better grid layout
      )}
    >
      <video
        ref={videoRef}
        className={cn("h-full w-full object-cover", mirrored ? "scale-x-[-1]" : "")}
        muted={muted} // Directly use the muted prop from the parent
        playsInline
      />
      {/* If an audioStream is provided, render a separate audio element */}
      {audioStream && <audio ref={audioRef} autoPlay playsInline />}
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">{label}</div>
    </div>
  )
}