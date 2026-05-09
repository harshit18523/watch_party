import { useState, useEffect, type SubmitEvent } from 'react';
import { io, Socket } from "socket.io-client";
import { PlaySquare, Users } from "lucide-react";
import './App.css';

import type { RoomState, User } from "./types";
import VideoPlayer from "./components/VideoPlayer";

const socket: Socket = io(import.meta.env.VITE_API_URL);  // connect to our local backend

function App() {
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [username, setUsername] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [room, setRoom] = useState<RoomState | null>(null);  // holds all our room data once we join

  useEffect(() => {
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("room_joined", (data: RoomState) => {
      setRoom(data);
    });

    socket.on("user_joined", (newUser: User & { participants: User[] }) => {
      setRoom(prev => prev ? { ...prev, participants: newUser.participants } : null);
    });

    socket.on("user_left", (data: { userId: string, participants: User[] }) => {
      setRoom(prev => prev ? { ...prev, participants: data.participants } : null);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_joined");
      socket.off("user_joined");
      socket.off("user_left");
    };
  }, []);

  const handleJoin = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (username.trim() && roomId.trim()) {
      socket.emit("join_room", { roomId, username });
    }
  };

  if (room) {
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
              <li key={p.userId} className="flex justify-between items-center p-2 bg-gray-700 rounded-lg">
                <span className="font-medium">{p.username} {p.userId === socket.id ? '(You)' : ''}</span>
                <span className={`text-xs px-2 py-1 rounded ${p.role === 'Host' ? 'bg-yellow-600' : 'bg-gray-600'}`}>
                  {p.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Watch Party</h1>
          <p className="text-sm text-gray-400">
            Status: {isConnected ? <span className="text-green-400">Connected</span> : <span className="text-red-400">Disconnected</span>}
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g. JohnDoe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Room ID</label>
            <input 
              type="text" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g. movie-night"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={!isConnected}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
