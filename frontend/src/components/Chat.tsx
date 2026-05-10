import { Socket } from "socket.io-client";
import { useState, useRef, useEffect, type SubmitEvent } from "react";
import { Send } from "lucide-react";

import type { ChatMessage } from "../types";

interface ChatProps {
  socket: Socket;
  initialMessages: ChatMessage[];
}

export default function Chat({ socket, initialMessages }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [chatInput, setChatInput] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {  // auto scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    socket.on("recieve_message", (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off("recieve_message");
    };
  }, [socket]);

  const handleSendMessage = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit("send_message", { text: chatInput });
    setChatInput("");
  };

  return(
    <div className="flex flex-col flex-1 bg-gray-800/50 overflow-hidden">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center text-sm mt-10">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.userId === socket.id ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] text-gray-400 mb-1 ml-1">
                {msg.username} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className={`px-3 py-2 rounded-lg text-sm max-w-[90%] wrap-break-word ${
                msg.userId === socket.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
              }`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} /> 
      </div>

      {/* Chat Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 bg-gray-900 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
        />
        <button 
          type="submit"
          disabled={!chatInput.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
