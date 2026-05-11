import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

interface FloatingReaction {
  id: string;
  emoji: string;
  xPosition: number;
}

interface ReactionOverlayProps {
  socket: Socket;
}

export default function ReactionOverlay({ socket }: ReactionOverlayProps) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    socket.on("recieve_reaction",({ id, emoji }) => {
      const xPosition = Math.floor(Math.random() * 80) + 10;  // random x position between 10% and 90%
      setReactions(prev => [...prev, { id, emoji, xPosition }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 2000);
    });

    return () => {
      socket.off("recieve_reaction");
    };
  }, [socket]);

  return (
    <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden z-50">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-10 text-4xl animate-float-up"
          style={{ left: `${r.xPosition}%` }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
}
