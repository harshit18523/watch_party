type Role = "Host" | "Moderator" | "Participant" | "Viewer";

interface User {
  userId: string;  // we will use socket.id as userId
  username: string;
  role: Role;
}

interface Room {
  roomId: string;
  participants: User[];  // will add video sttate later
  videoState: {  // to keep track of what is currently playing
    videoId: string;  // yt video id
    isPlaying: boolean;
    currentTime: number;
    playbackRate: number;
  };
}

interface JoinRoomPayload {
  roomId: string;
  username: string;
}

interface LeaveRoomPayload {
  roomId: string;
}

interface SeekPayload {
  time: number;
}

interface ChangeVideoPayload {
  videoId: string;
}

interface RateChangePayload {
  rate: number;
}

export type { Role, User, Room, JoinRoomPayload, LeaveRoomPayload, SeekPayload, ChangeVideoPayload, RateChangePayload };
