"use client"

import { Mic, MicOff, Phone, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContext } from "react";
import { SocketContext } from "@/context/SocketContextProvider";

export default function MeetingControls({roomId}) {
  const {isMuted,isVideoOff,onToggleMute,onToggleVideo,onLeave} = useContext(SocketContext);
  return (
    <div className="flex justify-center items-center gap-4 p-4 bg-gray-900 rounded-md">
      <Button
        variant={isMuted ? "destructive" : "secondary"}
        onClick={()=>onToggleMute(roomId)}
        className="h-12 w-12 rounded-full p-0"
      >
        {isMuted ? <MicOff /> : <Mic />}
      </Button>
      <Button
        variant={isVideoOff ? "destructive" : "secondary"}
        onClick={()=>onToggleVideo(roomId)}
        className="h-12 w-12 rounded-full p-0"
      >
        {isVideoOff ? <VideoOff /> : <Video />}
      </Button>
      <Button
        variant="destructive"
        onClick={()=>onLeave(roomId)}
        className="h-12 w-12 rounded-full p-0"
      >
        <Phone />
      </Button>
    </div>
  );
}