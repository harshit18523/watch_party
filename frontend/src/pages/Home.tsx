import { useNavigate } from "react-router";
import { MonitorPlay, Sparkles, Users } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      
      {/* --- HERO SECTION --- */}
      <div className="text-center max-w-2xl mb-12 animate-fade-in-up">
        {/* Logo Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-600/20 rounded-full border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <MonitorPlay size={48} className="text-blue-500" />
          </div>
        </div>
        
        {/* Headline & 3-Line Description */}
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
          Watch Together, <span className="bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-blue-600">Anywhere.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 font-medium px-4 leading-relaxed">
          Experience your favorite YouTube videos with friends in perfect real-time sync. 
          Host a virtual movie night, chat, and react together no matter where you are.
        </p>
      </div>

      {/* --- ACTION CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        
        {/* Create Room Card */}
        <button 
          onClick={() => navigate('/create')}
          className="group relative flex flex-col items-center text-center p-8 bg-gray-800 hover:bg-gray-800/80 border border-gray-700 hover:border-blue-500/50 rounded-2xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] hover:-translate-y-1"
        >
          {/* Decorative Sparkle that appears on hover */}
          <div className="absolute top-4 right-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Sparkles size={20} />
          </div>
          
          <div className="bg-gray-900/50 p-4 rounded-full mb-5 group-hover:scale-110 transition-transform duration-300">
            <MonitorPlay size={36} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">Start a Party</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Create a secure room and get a shareable invite link. You'll be the Host with full control over the video and playback.
          </p>
        </button>

        {/* Join Room Card */}
        <button 
          onClick={() => navigate('/join')}
          className="group flex flex-col items-center text-center p-8 bg-gray-800 hover:bg-gray-800/80 border border-gray-700 hover:border-green-500/50 rounded-2xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(34,197,94,0.15)] hover:-translate-y-1"
        >
          <div className="bg-gray-900/50 p-4 rounded-full mb-5 group-hover:scale-110 transition-transform duration-300">
            <Users size={36} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">Join a Party</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Already have an invite code or link? Enter it here to jump straight into the action with your friends.
          </p>
        </button>

      </div>
    </div>
  );
}