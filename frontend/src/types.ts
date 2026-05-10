type Role = "Host" | "Moderator" | "Participant" | "Viewer";

interface User {
  userId: string;  // we will use socket.id as userId
  username: string;
  role: Role;
}

interface VideoState {
  videoId: string;  // yt video id
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
}

interface RoomState {
  roomId: string;
  role: Role;
  participants: User[];
  videoState: VideoState;
}

interface ChatMessage {
  id: string;  // unique id for react rendering
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

export type { Role, User, VideoState, RoomState, ChatMessage };
