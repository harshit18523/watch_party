import { useEffect, useState, type SubmitEvent } from "react";
import { useNavigate, Link, useLocation } from "react-router";

import { socket } from "../socket";

export default function JoinRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState<string>("");
  const [roomId, setRoomId] = useState<string>(location.state?.prefillRoomId || "");  // autofill input if they came from shared link
  const [error, setError] = useState<string>("");

  useEffect(() => {
    socket.on("room_joined", (data) => {
      navigate(`/room/${data.roomId}`, { state: { roomData: data } });
    });

    socket.on("room_error", (errorMsg: string) => setError(errorMsg));

    return () => {
      socket.off("room_joined");
      socket.off("room_error");
    };
  }, [navigate]);

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomId.trim()) return setError("All fields required.");
    socket.emit("join_room", { roomId, username });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <h1 className="text-3xl font-bold mb-6 text-center">Join Watch Party</h1>
        
        {error && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="name" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" />
          <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="ID of Room you want to join" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">Join Room</button>
        </form>
        
        <p className="mt-4 text-center text-gray-400">
          Wanna create your own room? <Link to="/create" className="text-blue-400 hover:underline">Create here</Link>
        </p>
      </div>
    </div>
  );
}
