// Meeting room page: server component wrapper that passes roomId to client component.
"use client"
import React from "react";
import MeetingRoom from "@/components/meeting/meeting-room"

export default function MeetingRoomPage({ params }) {
  const {roomId} = React.use(params);
  return <MeetingRoom roomId={roomId} />
}
