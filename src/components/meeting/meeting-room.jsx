// meetingroom.jsx (FIXED)

"use client"

import { useContext, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import RealtimeAgentWidget from "../agent/RealtimeAgentWidget"
import VideoTile from "./video-tile"
import { SocketContext } from "@/context/SocketContextProvider"

export default function MeetingRoom({ roomId }) {
  const { joinRoom, localStream, remoteStreams, lenaStart } = useContext(SocketContext);

  useEffect(() => {
    // Join the room once when the component mounts
    joinRoom();
  }, []) 

  // Group streams by participant ID. 
  const participants = useMemo(() => {
    const grouped = remoteStreams.reduce((acc, { id, stream, kind }) => {
      // If we haven't seen this participant ID before, create an entry for them
      if (!acc[id]) {
        acc[id] = { id };
      }
      if (kind === 'video') {
        acc[id].videoStream = stream;
      } else if (kind === 'audio') {
        acc[id].audioStream = stream;
      }
      return acc;
    }, {});

    // The result of reduce is an object, but we need an array to map over for rendering
    return Object.values(grouped);
  }, [remoteStreams]);

  return (
    <div className="w-full h-dvh p-4">
      <h1>Meeting Room ID: {roomId}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {/* Local user's video tile. It MUST be muted and mirrored. */}
        <VideoTile
          stream={localStream}
          label="You"
          muted={true}
          mirrored={true}
        />

        {/* Map over the processed participants array */}
        {participants.map((p) => (
          <VideoTile
            key={p.id}
            label={`Participant ${p.id.substring(0, 4)}`}
            stream={p.videoStream}
            audioStream={p.audioStream}
          />
        ))}
      </div>
      {/* Sidebar with the AI Agent Widget */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
        <RealtimeAgentWidget
          agentName="Meeting Assistant"
          agentInstructions="You are a helpful meeting assistant. Summarize key points and answer questions concisely. The current meeting ID is ZVQQ-97T3."
          // tokenUrl="https://your-production-url/api/get-token" // Optional: override for different environments
        />
        {/* You could add a ChatPanel or other components here */}
      </div>

    </div>
  );
}