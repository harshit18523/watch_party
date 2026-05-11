import { io, Socket } from "socket.io-client";
// Exporting it this way ensures a single, persistent connection across all routes.
export const socket: Socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:3000");
