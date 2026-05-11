import { useLocation, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { Users, Lock, Unlock, Copy, Check } from "lucide-react";

import type { Role, RoomState, User } from "../types";
import { socket } from "../socket";
import VideoPlayer from "../components/VideoPlayer";
import Chat from "../components/Chat";
import ReactionBar from "../components/ReactionBar";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [room, setRoom] = useState<RoomState | null>(location.state?.roomData || null);  // initialize state from router history if we just navigated here from create/join
  const [copied, setCopied] = useState<boolean>(false);

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

    socket.on("host_transferred", (data) => {
      setRoom(prev => {
        if (!prev) return null;
        let updatedRole = prev.role;
        if (socket.id === data.newHostId) updatedRole = "Host";  // if i'm user receiving host powers, update my local role
        else if (socket.id === data.oldHostId) updatedRole = "Moderator";  // if i was old host giving it away, demote my local role
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

    socket.on("room_deleted", () => {
      alert("The Host has ended the Watch Party.");
      navigate('/join');
    });

    socket.on("room_locked_state", ({ isLocked }) => {
      setRoom(prev => prev ? { ...prev, isLocked } : null);
    });

    return () => {
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("role_assigned");
      socket.off("host_transferred");
      socket.off("participant_removed");
      socket.off("kicked");
      socket.off("room_deleted");
      socket.off("room_locked_state");
    };
  }, [navigate, room, roomId]);

  const handleLeaveRoom = () => {
    socket.emit("leave_room");
    navigate("/join");  // send them back to lobby
  };

  const handleDeleteRoom = () => {  // add quick confirmation so host doesnt accidentally click it
    if (window.confirm("Are you sure you want to end the Watch Party for everyone?")) {
      socket.emit("delete_room");
    }
  };

  const handleToggleModerator = (userId: string, currentRole: Role) => {
    const newRole = currentRole === "Moderator" ? "Participant" : "Moderator";
    socket.emit("assign_role", { userId, role: newRole });
  };

  const handleKickUser = (userId: string) => {
    socket.emit("remove_participant", { userId });
  };

  const handleTransferHost = (userId: string) => {
    if (window.confirm("Are you sure you want to transfer Host permissions? You will be demoted to Moderator.")) {
      socket.emit("transfer_host", { newHostId: userId });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {  // copies full current url
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);  // reset icon back to 'Copy' after 2 seconds
    });
  };

  const handleToggleLock = () => {
    if (room) {
      socket.emit("toggle_lock", { isLocked: !room.isLocked });
    }
  };

  if (!room) return (<div className="text-white text-center mt-20">Loading room data...</div>);

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-gray-900 text-white flex flex-col">

      {/* 1. TOP NAV BAR: Room Name & Exit Controls */}
      <header className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-xl flex items-center gap-2">
            <span className="text-blue-500">▶</span> Watch Party: {room.roomId}
          </h1>
          <button
            onClick={handleCopyLink}
            title="Copy Invite Link"
            className="flex items-center gap-1.5 px-2 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-sm text-gray-300 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check size={14} className="text-green-400" />
                <span className="text-green-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
        
        <div className="flex gap-3 items-center">
          
          {/* --- ROOM LOCK UI --- */}
          {room.role === 'Host' ? (
            <button 
              onClick={handleToggleLock}
              className={`flex items-center gap-2 text-sm font-medium py-2 px-4 rounded-lg transition-colors border ${
                room.isLocked 
                  ? 'bg-red-900/50 hover:bg-red-900 text-red-200 border-red-700' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600'
              }`}
            >
              {room.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
              {room.isLocked ? 'Room Locked' : 'Room Unlocked'}
            </button>
          ) : (
            room.isLocked && (
              <span className="flex items-center gap-1 text-sm font-medium text-red-400 px-3 py-2 bg-red-900/20 rounded-lg border border-red-900/50">
                <Lock size={14} /> Locked
              </span>
            )
          )}
          {/* ------------------ */}

          <button 
            onClick={handleLeaveRoom}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors border border-gray-600 ml-2"
          >
            Leave Room
          </button>
          
          {room.role === 'Host' && (
            <button 
              onClick={handleDeleteRoom}
              className="bg-red-600/80 hover:bg-red-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors border border-red-500"
            >
              End Party
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA: 3-Column Layout */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col lg:flex-row gap-4">

        {/* COLUMN 1: Participants Sidebar (Left) */}
        <div className="w-full lg:w-64 h-full bg-gray-800 rounded-xl border border-gray-700 flex flex-col overflow-hidden shadow-2xl shrink-0">
          <div className="p-4 border-b border-gray-700 bg-gray-900/50 shrink-0">
            <h3 className="font-semibold flex items-center gap-2 text-gray-200">
              <Users size={18} className="text-blue-400" /> Participants ({room.participants.length})
            </h3>
          </div>

          <ul className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {room.participants.map(p => (
              <li key={p.userId} className="flex flex-col p-2.5 bg-gray-700/50 border border-gray-600/50 rounded-lg text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium truncate mr-2">
                    {p.username} {p.userId === socket.id ? <span className="text-gray-400 font-normal">(You)</span> : ''}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider uppercase ${p.role === 'Host' ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-600/50' :
                    p.role === 'Moderator' ? 'bg-green-600/20 text-green-400 border border-green-600/50' :
                      'bg-gray-600/50 text-gray-300 border border-gray-500/50'
                    }`}>
                    {p.role}
                  </span>
                </div>

                {/* Host Controls for Moderation */}
                {room.role === 'Host' && p.userId !== socket.id && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-gray-600/50">
                    <button
                      onClick={() => handleTransferHost(p.userId)}
                      className="flex-1 text-[10px] bg-yellow-600/80 hover:bg-yellow-600 py-1 rounded transition-colors text-yellow-100"
                    >
                      Make Host
                    </button>
                    <button
                      onClick={() => handleToggleModerator(p.userId, p.role)}
                      className="flex-1 text-[10px] bg-blue-600/80 hover:bg-blue-600 py-1 rounded transition-colors"
                    >
                      {p.role === 'Moderator' ? 'Revoke Mod' : 'Make Mod'}
                    </button>
                    <button
                      onClick={() => handleKickUser(p.userId)}
                      className="flex-1 text-[10px] bg-red-600/80 hover:bg-red-600 py-1 rounded transition-colors"
                    >
                      Kick
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* COLUMN 2: Video Player (Center) */}
        {/* We use flex-1 here so the video always takes up the maximum remaining space */}
        <div className="flex-1 flex flex-col gap-4 h-full min-w-[320px]">
          
          <div className="w-full rounded-xl overflow-hidden shadow-2xl bg-black border border-gray-700 shrink-0">
            <VideoPlayer socket={socket} room={room} />
          </div>

          {/* Cleanly imported Reaction Bar! */}
          <ReactionBar socket={socket} />

        </div>

        {/* COLUMN 3: Chat Sidebar (Right) */}
        <div className="w-full lg:w-80 h-full bg-gray-800 rounded-xl border border-gray-700 flex flex-col overflow-hidden shadow-2xl shrink-0">
          <div className="p-4 border-b border-gray-700 bg-gray-900/50 shrink-0">
            <h3 className="font-semibold text-gray-200">Live Chat</h3>
          </div>
          <Chat socket={socket} initialMessages={room.messages} />
        </div>

      </div>
    </div>
  );
}