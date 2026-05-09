import { Socket } from "socket.io-client";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import YouTube, { type YouTubePlayer, type YouTubeEvent } from "react-youtube";
import { Search } from "lucide-react";

import type { RoomState } from "../types";

interface VideoPlayerProps {
  socket: Socket;
  room: RoomState;
}

export default function VideoPlayer({ socket, room }: VideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string>(room.videoState.videoId);
  const [videoInput, setVideoInput] = useState<string>("");
  const isSyncing = useRef<boolean>(false);  // prevents infinite loops when socket updates player

  const hasControl = room.role === "Host" || room.role === "Moderator";  // check if current user has permission to control video

  useEffect(() => {  // listen for incoming sync events from server
    socket.on("play", ({ time }) => {
      isSyncing.current = true;
      playerRef.current?.seekTo(time, true);  // sync time just to be perfectly aligned
      playerRef.current?.playVideo();
    });

    socket.on("pause", ({ time }) => {
      isSyncing.current = true;
      playerRef.current?.seekTo(time, true);
      playerRef.current?.pauseVideo();
    });

    socket.on("seek", ({ time }) => {
      isSyncing.current = true;
      playerRef.current?.seekTo(time, true);
      setTimeout(() => {  // failsafe: reset syncing flag after seek completes
        isSyncing.current = false;
      }, 1000);
    });

    socket.on("rate_change", ({ rate }) => {
      isSyncing.current = true;
      playerRef.current?.setPlaybackRate(rate);
      setTimeout(() => {
        isSyncing.current = false;
      }, 500);
    });

    socket.on("change_video", ({ videoId }) => {
      setCurrentVideoId(videoId);
    });

    return () => {
      socket.off("play");
      socket.off("pause");
      socket.off("seek");
      socket.off("rate_change");
      socket.off("change_video");
    };
  }, [socket]);

  const onReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    if (room.videoState.currentTime > 0) {  // jump to current time if we joined late
      event.target.seekTo(room.videoState.currentTime, true);
    }
    event.target.setPlaybackRate(room.videoState.playbackRate || 1);  // catch up to current speed
    if (room.videoState.isPlaying) {  // explicitly check state and force play or pause
      event.target.playVideo();
    } else {
      event.target.pauseVideo();
    }
  };

  const onPlay = (event: YouTubeEvent) => {
    if (isSyncing.current) {
      isSyncing.current = false;  // reset flag and ignore
      return;
    } else if (hasControl) socket.emit("play", { time: event.target.getCurrentTime() });  // send exact time it was played
  };

  const onPause = (event: YouTubeEvent) => {
    if (isSyncing.current) {
      isSyncing.current = false;
      return;
    } else if (hasControl) socket.emit("pause", { time: event.target.getCurrentTime() });  // send exact time it was paused
  };

  const onStateChange = (event: YouTubeEvent) => {
    // if (event.data === 1) {  // yt state 1 is 'playing. once video actually starts playing, we verify it is running at exact speed our room state expects
    //   const expectedRate = room.videoState.playbackRate || 1;
    //   if (event.target.getPlaybackRate() !== expectedRate) {
    //     event.target.setPlaybackRate(expectedRate);
    //   }
    // }
    if (!hasControl || isSyncing.current) return;
    else if (event.data === 3) {  // yt state 3 is 'buffering'. this triggers reliably when host scrubs timeline
      const currentTime = event.target.getCurrentTime();
      socket.emit("seek", { time: currentTime });
    }
  };

  const onRateChange = (event: YouTubeEvent) => {
    if (!hasControl || isSyncing.current) return;
    socket.emit("rate_change", { rate: event.data });  // event.data contains new playback speed (e.g., 0.5, 1.5, 2)
  };

  const handleChangeVideo = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasControl || !videoInput.trim()) return;
    let extractedId = videoInput;  // extract video id from full yt url if user pastes link
    if (videoInput.includes("v=")) {
      extractedId = videoInput.split("v=")[1].substring(0, 11);
    } else if (videoInput.includes("youtu.be/")) {
      extractedId = videoInput.split("youtu.be/")[1].substring(0, 11);
    }
    socket.emit("change_video", { videoId: extractedId });
    setVideoInput("");
  };

  const pointerEvents = hasControl ? "auto" : "none";  // prevent participants from clicking player

  return (
    <div className="flex flex-col h-full w-full">
      <div 
        className="w-full aspect-video bg-black rounded-lg overflow-hidden relative"
        style={{ pointerEvents }} 
      >
        <YouTube
          videoId={currentVideoId}
          onReady={onReady}
          onPlay={onPlay}
          onPause={onPause}
          onStateChange={onStateChange}
          onPlaybackRateChange={onRateChange}
          opts={{
            width: '100%',
            height: '100%',
            playerVars: {
              autoplay: 0,
              controls: hasControl ? 1 : 0, 
              disablekb: hasControl ? 0 : 1, 
            },
          }}
          className="absolute top-0 left-0 w-full h-full"
        />
        
        {!hasControl && (
          <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded text-sm text-gray-300">
            Watch-Only Mode (Waiting for Host)
          </div>
        )}
      </div>

      {hasControl && (
        <form onSubmit={handleChangeVideo} className="mt-4 flex gap-2">
          <input
            type="text"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            placeholder="Paste YouTube URL or Video ID..."
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          />
          <button 
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Search size={18} /> Change Video
          </button>
        </form>
      )}
    </div>
  );
}
