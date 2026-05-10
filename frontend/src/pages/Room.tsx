import { useLocation, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { PlaySquare, Users } from "lucide-react";

import type { Role, RoomState, User } from "../types";
import { socket } from "../socket";
import VideoPlayer from "../components/VideoPlayer";


export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [room, setRoom] = useState<RoomState | null>(location.state?.roomData || null);  // initialize state from router history if we just navigated here from create/join

  useEffect(() => {
    if (!room) {  // pass roomId from url back to join page
      navigate("/join", { state: { prefillRoomId: roomId } });
      return;
    }

    socket.on("user_joined", (newUser: User & { participants: User[] }) => {
      setRoom(prev => prev ? { ...prev, participants: newUser.participants } : null);
    });

    socket.on("user_left", (data: { userId: string, participants: User[] }) => {
      setRoom(prev => prev ? { ...prev, participants: data.participants } : null);
    });

    socket.on("role_assigned", (data) => {
      setRoom(prev => {
        if (!prev) return null;
        const updatedRole = data.userId === socket.id ? data.role : prev.role;  // if role change happened to this user, update their specific role state
        return { ...prev, role: updatedRole, participants: data.participants };
      });
    });

    socket.on("participant_removed", (data) => {
      setRoom(prev => prev ? { ...prev, participants: data.participants } : null);
    });

    socket.on("kicked", () => {
      alert("You have been removed from the room by the Host.");
      navigate("/join");
    });

    return () => {
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("role_assigned");
      socket.off("participant_removed");
      socket.off("kicked");
    };
  }, [navigate, room, roomId]);

  const handleToggleModerator = (userId: string, currentRole: Role) => {
    const newRole = currentRole === "Moderator" ? "Participant" : "Moderator";
    socket.emit("assign_role", { userId, role: newRole });
  };

  const handleKickUser = (userId: string) => {
    socket.emit("remove_participant", { userId });
  };

  if (!room) return (<div className="text-white text-center mt-20">Loading room data...</div>);

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
      {/* Main Video Area */}
      <div className="flex-1 bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PlaySquare className="text-red-500" /> Room: {room.roomId}
          </h2>
          <span className="px-3 py-1 bg-blue-600 text-sm font-semibold rounded-full">
            Your Role: {room.role}
          </span>
        </div>

        <VideoPlayer socket={socket} room={room} />
      </div>

      {/* Sidebar: Participants */}
      <div className="w-full md:w-80 bg-gray-800 rounded-xl p-4 border border-gray-700 h-fit">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users size={20} /> Participants ({room.participants.length})
        </h3>
        <ul className="space-y-2">
          {room.participants.map(p => (
            <li key={p.userId} className="flex flex-col p-3 bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {p.username} {p.userId === socket.id ? '(You)' : ''}
                </span>
                <span className={`text-xs px-2 py-1 rounded font-bold ${p.role === 'Host' ? 'bg-yellow-600' :
                  p.role === 'Moderator' ? 'bg-green-600' : 'bg-gray-500'
                  }`}>
                  {p.role}
                </span>
              </div>

              {/* Host Controls: Only show if I am the Host, and I am not looking at myself */}
              {room.role === 'Host' && p.userId !== socket.id && (
                <div className="flex gap-2 mt-3 pt-2 border-t border-gray-600">
                  <button
                    onClick={() => handleToggleModerator(p.userId, p.role)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
                  >
                    {p.role === 'Moderator' ? 'Revoke Mod' : 'Make Mod'}
                  </button>
                  <button
                    onClick={() => handleKickUser(p.userId)}
                    className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors"
                  >
                    Kick User
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}