import type { Socket } from "socket.io-client";

interface ReactionBarProps {
  socket: Socket;
}

const EMOJIS = ["😀", "😂", "😍", "👍", "🎉", "😢", "😡", "🔥", "😲", "❤️", "👏", "👀"];

export default function ReactionBar({ socket }: ReactionBarProps) {
  const handleSendReaction = (emoji: string) => {
    socket.emit("send_reaction", { emoji });
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-3 flex justify-center gap-6 shadow-md shrink-0">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleSendReaction(emoji)}
          className="text-2xl hover:scale-150 hover:-translate-y-2 transition-all duration-200 active:scale-90"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
