import dotenv from "dotenv";
dotenv.config({
  path: ".env"
});

import { createServer } from "http";
import express from "express";
import cors from "cors";
import { Server, Socket } from "socket.io";

import type { Role, User, Room, JoinRoomPayload, SeekPayload, ChangeVideoPayload, RateChangePayload, ChatMessage } from "./types.js";
import { join } from "path";

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

  socket.on("create_room", ({ roomId, username }: JoinRoomPayload) => {  // create room
    if (rooms.has(roomId.trim())) return socket.emit("room_error", "Room ID already exists. Please choose another.");
    else if (/\s/.test(roomId)) return socket.emit("room_error", "Room ID cannot contain spaces.");  // 1. validation checks
    const room: Room = {  // 2. create room
      roomId,
      participants: [],
      videoState: {
        videoId: "",
        isPlaying: false,
        currentTime: 0,
        playbackRate: 1
      }
    };
    rooms.set(roomId, room);
    const newUser: User = {  // 3. add host
      userId: socket.id,
      username,
      role: "Host"
    };
    room.participants.push(newUser);
    socket.join(roomId);
    socket.emit("room_joined", {  // 4. send success state
      roomId,
      role: newUser.role,
      participants: room.participants,
      videoState: room.videoState
    });
    console.log(`${username} (${socket.id}) created and joined room ${roomId} as Host`);
  });

  socket.on("join_room", ({ roomId, username }: JoinRoomPayload) => {  // join existing room
    const room = rooms.get(roomId);
    if (!room) return socket.emit("room_error", "Room not found. Please check the ID and try again.");  // 1. validation check
    const newUser: User = {  // 2. add participant
      userId: socket.id,
      username,
      role: "Participant"
    };
    room.participants.push(newUser);
    socket.join(roomId);
    socket.to(roomId).emit("user_joined", {  // 3. broadcast to others and send state to new user
      ...newUser,
      participants: room.participants
    });
    socket.emit("room_joined", {
      roomId,
      role: newUser.role,
      participants: room.participants,
      videoState: room.videoState
    });
    console.log(`${username} (${socket.id}) joined room ${roomId} as Participant`);
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
      isPlaying: false,  // always starts paused
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

  socket.on("assign_role", ({ userId, role }: { userId: string, role: Role }) => {
    const data = getRoomAndUser(socket.id);
    if (!data || data.user.role !== "Host") return;  // validate: only host can assign roles
    const targetUser = data.room.participants.find(p => p.userId === userId);
    if (targetUser) {
      targetUser.role = role;
      io.in(data.room.roomId).emit("role_assigned", {  // broadcast updated participant list
        userId,
        username: targetUser.username,
        role,
        participants: data.room.participants
      });
    }
  });

  socket.on("remove_participant", ({ userId }: { userId: string }) => {
    const data = getRoomAndUser(socket.id);
    if (!data || data.user.role !== "Host") return;  // validate: only Host can remove people
    const userIndex = data.room.participants.findIndex(p => p.userId === userId);
    if (userIndex !== -1) {
      data.room.participants.splice(userIndex, 1);  // remove user from our state
      io.in(data.room.roomId).emit("participant_removed", {  // notify remaining users
        userId,
        participants: data.room.participants
      });
      const targetSocket = io.sockets.sockets.get(userId);  // target specific user's socket to kick them out
      if (targetSocket) {
        targetSocket.leave(data.room.roomId);
        targetSocket.emit("kicked");  // tell their frontend they were booted
      }
    }
  });

  socket.on("sync_heartbeat", (state: { time: number, isPlaying: boolean, rate: number }) => {
    const data = getRoomAndUser(socket.id);
    if (!data || data.user.role !== "Host") return;  // security check: only host can dictate true time
    data.room.videoState.currentTime = state.time;  // update the server's absolute source of truth
    data.room.videoState.isPlaying = state.isPlaying;
    data.room.videoState.playbackRate = state.rate;
    socket.to(data.room.roomId).emit("host_heartbeat", state);  // broadcast host's exact reality to everyone else
    // console.log("host pulse received");
  });

  socket.on("send_message", ({ text }: { text: string }) => {
    const data = getRoomAndUser(socket.id);
    if (!data) return;
    const message: ChatMessage = {  // construct message object
      id: Math.random().toString(36).substring(2, 9),  // simple unique id
      userId: data.user.userId,
      username: data.user.username,
      text,
      timestamp: Date.now()
    };
    io.in(data.room.roomId).emit("recieve_message", message);  // broadcast to everyone in room including the sender, so their ui updates
  });

  socket.on("leave_room", () => {
    const data = getRoomAndUser(socket.id);
    if (!data) return;
    const { room, user } = data;
    const userIndex = room.participants.findIndex(p => p.userId === user.userId);
    if (userIndex !== -1) {
      room.participants.splice(userIndex, 1);  // 1. remove user from our state
      socket.leave(room.roomId);  // 2. unsubscribe socket from room channel
      socket.to(room.roomId).emit("user_left", {  // 3. notify remaining participants
        userId: user.userId,
        participants: room.participants
      });
      if (room.participants.length === 0) {  // 4. garbage collection: if last person leaves, destroy room
        rooms.delete(room.roomId);
        console.log(`Room ${room.roomId} deleted (empty)`);
      }
    }
  });

  socket.on("delete_room", () => {
    const data = getRoomAndUser(socket.id);
    if (!data || data.user.role !== "Host") return;  // security: only host can nuke room
    const { room } = data;
    io.in(room.roomId).emit("room_deleted");  // 1. tell everyone's frontend that room is gone
    const socketsInRoom = io.sockets.adapter.rooms.get(room.roomId);  // 2. force all connected sockets to leave physical room channel
    if (socketsInRoom) {
      for (const socketId of socketsInRoom) {
        const clientSocket = io.sockets.sockets.get(socketId);
        if (clientSocket) clientSocket.leave(room.roomId);
      }
    }
    rooms.delete(room.roomId);  // 3. delete room from server memory
    console.log(`Room ${room.roomId} deleted by Host`);
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
