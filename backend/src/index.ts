import dotenv from "dotenv";
dotenv.config({
  path: ".env"
});

import { createServer } from "http";
import express from "express";
import cors from "cors";
import { Server, Socket } from "socket.io";

import type { Role, User, Room, JoinRoomPayload, SeekPayload, ChangeVideoPayload, RateChangePayload } from "./types.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",  // we will restrict this in production
    methods: ["GET", "POST"]
  }
});

const rooms = new Map<string, Room>();  // in-memory store for rooms

function getRoomAndUser(socketId: string) {
  for (const room of rooms.values()) {
    const user = room.participants.find(p => p.userId === socketId);
    if (user) return { room, user };
  }
  return null;
}

function hasControlPermissions(role: Role): boolean {
  return role === "Host" || role === "Moderator";
}

io.on("connection", (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join_room", ({ roomId, username }: JoinRoomPayload) => {  // join room
    let room = rooms.get(roomId);
    let assignedRole: Role = "Participant";
    if (!room) { // 1. check if room exists
      assignedRole = "Host"; // 2. first user becomes host
      room = {
        roomId,
        participants: [],
        videoState: {  // default video state
          videoId: "dQw4w9WgXcQ",  // rickroll
          isPlaying: false,
          currentTime: 0,
          playbackRate: 1
        }
      };
      rooms.set(roomId, room);
    }
    const newUser: User = {  // 3. create user object
      userId: socket.id,
      username,
      role: assignedRole
    };
    room.participants.push(newUser);  // 4. add user to room state
    socket.join(roomId);  // 5. tell socket.io to put this connection into physical 'room'
    socket.to(roomId).emit("user_joined", {  // 6. broadcast to others in room that new user joined
      ...newUser,
      participants: room.participants
    });
    socket.emit("room_joined", {  // 7. send room state and current video state back to new user so they can sync up immediately
      roomId,
      role: newUser.role,
      participants: room.participants,
      videoState: room.videoState
    });  // we will expand this to include video state later

    console.log(`${username} (${socket.id}) joined room ${roomId} as ${assignedRole}`);
  });

  socket.on("play", ({ time }: { time: number }) => {
    const data = getRoomAndUser(socket.id);
    if (!data || !hasControlPermissions(data.user.role)) return;  // reject if no permission
    data.room.videoState.isPlaying = true;
    data.room.videoState.currentTime = time;  // save current time
    socket.to(data.room.roomId).emit("play", { time });  // broadcast to everyone else
  });

  socket.on("pause", ({ time }: { time: number }) => {
    const data = getRoomAndUser(socket.id);
    if (!data || !hasControlPermissions(data.user.role)) return;
    data.room.videoState.isPlaying = false;
    data.room.videoState.currentTime = time;  // save exact pause time
    socket.to(data.room.roomId).emit("pause", { time });
  });

  socket.on("seek", ({ time }: SeekPayload) => {
    const data = getRoomAndUser(socket.id);
    if (!data || !hasControlPermissions(data.user.role)) return;
    data.room.videoState.currentTime = time;
    socket.to(data.room.roomId).emit("seek", { time });
  });

  socket.on("change_video", ({ videoId }: ChangeVideoPayload) => {
    const data = getRoomAndUser(socket.id);
    if (!data || !hasControlPermissions(data.user.role)) return;
    data.room.videoState = {  // reset state for new video
      videoId,
      isPlaying: true,  // auto-play new video
      currentTime: 0,
      playbackRate: 1
    };
    io.in(data.room.roomId).emit("change_video", { videoId });  // broadcast to everyone including person who changed it, so all clients update their ui simultaneously
  });

  socket.on("rate_change", ({ rate }: RateChangePayload) => {
    const data = getRoomAndUser(socket.id);
    if (!data || !hasControlPermissions(data.user.role)) return;
    data.room.videoState.playbackRate = rate;
    socket.to(data.room.roomId).emit("rate_change", { rate });
  });

  socket.on("disconnect", () => {  // leave room
    console.log(`User disconnected: ${socket.id}`);

    for (const [roomId, room] of rooms.entries()) {  // find which room this user was in and remove them
      const userIndex = room.participants.findIndex(p => p.userId === socket.id);
      if (userIndex !== -1) {
        const removedUser = room.participants.splice(userIndex, 1)[0];
        socket.to(roomId).emit("user_left", {  // broadcast to room that they left
          username: removedUser?.username,
          userId: removedUser?.userId,
          participants: room.participants
        });
        if (room.participants.length === 0) {  // if room is empty, clean it up to prevent memory leaks
          rooms.delete(roomId);

          console.log(`Room ${roomId} deleted (empty)`);
        }
        break;  // socket is only in one room at a time in our app
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
