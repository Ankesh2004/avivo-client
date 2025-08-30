// Meeting room page: server component wrapper that passes roomId to client component.
import MeetingRoom from "@/components/meeting/meeting-room"

export default function MeetingRoomPage({ params }: { params: { roomId: string } }) {
  return <MeetingRoom roomId={params.roomId} />
}
