// Main meeting UI: handles local/remote media, active speaker, chat panel.
// NOTE: This is a client-only module that expects a mediasoup signaling server.
// Provide NEXT_PUBLIC_SIGNALING_URL in Project Settings to connect.
// In absence of a server, "demoMode" simulates remote tiles for UI preview.

"use client"

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Mic, MicOff, Video, VideoOff, MessageSquareMore, Monitor, PhoneOff } from "lucide-react"
import VideoTile from "./video-tile"
import ChatPanel from "./chat-panel"
import { SocketContext } from "@/context/SocketContextProvider"

// type PeerId = string

// type RemotePeer = {
//   id: PeerId
//   displayName: string
//   videoStream?: MediaStream
//   audioStream?: MediaStream
//   volume?: number // for active speaker heuristic
// }
export default function MeetingRoom({ roomId }) {
  // Component logic here
  // const [localStream,setLocalStream] = useState(null);
  const {joinRoom,localStream,remoteStreams,lenaStart} = useContext(SocketContext);
  useEffect(()=>{
    // async function getStream() {
    //   const ls= await navigator.mediaDevices.getUserMedia({
    //     audio:true,
    //     video:true
    // })
    //   setLocalStream(ls);
    // }
    // getStream();
    joinRoom();
  },[])
  return (
  <div className="w-full h-dvh">
    <h1>Meeting Room ID: {roomId}</h1>
    <VideoTile stream={localStream} label="local"></VideoTile>
    <div>
      {
        remoteStreams && remoteStreams.map((stream,idx)=>(
          <VideoTile stream={stream} key={idx} label="remote"></VideoTile>
        ))
      }
    </div>
    <Button onClick={lenaStart}>Lena Start</Button>
  </div>
  );
}

