import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface Props {
  src: string;
  isIncoming: boolean;
}

export function AudioMessage({ src, isIncoming }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1); // 1, 1.5, 2

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const changeSpeed = () => {
    const newSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 1;
      setProgress((current / duration) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg min-w-[200px] ${isIncoming ? 'bg-white dark:bg-slate-800' : 'bg-green-100 dark:bg-green-900'}`}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="hidden"
      />
      
      <button onClick={togglePlay} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 transition">
        {isPlaying ? <Pause className="w-4 h-4 text-slate-700 dark:text-white" /> : <Play className="w-4 h-4 text-slate-700 dark:text-white ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1 bg-slate-300 dark:bg-slate-600 rounded-full w-full cursor-pointer relative overflow-hidden">
          <div 
            className="h-full bg-blue-500 absolute left-0 top-0 transition-all duration-100" 
            style={{ width: `${progress}%` }} 
          />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
           {/* Aquí podrías formatear el tiempo si quieres */}
           Audio
        </span>
      </div>

      <button 
        onClick={changeSpeed} 
        className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white hover:bg-slate-300 transition w-10"
      >
        {speed}x
      </button>
    </div>
  );
}
