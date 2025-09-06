"use client"

import { useContext, useEffect, useMemo } from "react"
import { SocketContext } from "@/context/SocketContextProvider"
import VideoTile from "./video-tile"
import RealtimeAgentWidget from "../agent/RealtimeAgentWidget"
import MeetingControls from "./meeting-controls"
export default function MeetingRoom({ roomId }) {

  const { rooms, joinRoom, leaveRoom } = useContext(SocketContext);

  const currentRoomState = rooms[roomId];
  const localStream = currentRoomState?.localStream;
  const remoteStreams = currentRoomState?.remoteStreams || []; // Default to empty array to prevent errors

  useEffect(() => {
    if (roomId) {
      joinRoom(roomId);
    }

    return () => {
      if (roomId) {
        leaveRoom(roomId);
      }
    };
  }, []); // TODO : add dependencies without causing race

  const participants = useMemo(() => {
    const grouped = remoteStreams.reduce((acc, { id, stream, kind }) => {
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
    return Object.values(grouped);
  }, [remoteStreams]);

  return (
    <div className="w-full h-dvh p-4 flex gap-4">
      {/* Main meeting area */}
      <div className="flex-1">
        <h1>Meeting Room ID: {roomId}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {/* Local user's video tile. It MUST be muted and mirrored. */}
          {localStream && (
            <VideoTile
              stream={localStream}
              label="You"
              muted={true}
              mirrored={true}
            />
          )}

          {participants.map((p) => (
            <VideoTile
              key={p.id}
              label={`Participant ${p.id.substring(0, 4)}`}
              stream={p.videoStream} // The video stream for the participant
              audioStream={p.audioStream} // The separate audio stream
            />
          ))}
        </div>
      </div>

      {/* Sidebar with the AI Agent Widget */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
        <RealtimeAgentWidget
          agentName="Meeting Assistant"
          agentInstructions={`You are a helpful meeting assistant. Summarize key points and answer questions concisely. The current meeting ID is ${roomId}.`}
        />
      </div>

        <MeetingControls roomId={roomId}/>
    </div>
  );
}