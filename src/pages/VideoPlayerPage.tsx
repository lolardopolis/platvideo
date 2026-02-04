import { useParams, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Loader2, Settings, Check } from 'lucide-react';
import { CommentSidebar } from '../components/CommentSidebar';
import { videosApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface VideoData {
  id: string;
  title: string;
  videoUrl: string;
  duration: number;
  thumbnail: string | null;
  quiz?: any;
  summary?: string;
  chapters?: Array<{ timestamp: number; title: string }>;
  module?: {
    title: string;
    course?: {
      id: string;
      title: string;
    };
  };
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function VideoPlayerPage() {
  const { id } = useParams();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { token } = useAuth();
  
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const lastSavedTime = useRef(0);

  // Save progress to backend
  const saveProgress = useCallback(async (watched: number, completed: boolean = false) => {
    if (!id || !token) return;
    try {
      await videosApi.updateProgress(id, { 
        watchedSeconds: Math.floor(watched),
        completed: completed || undefined
      }, token);
      lastSavedTime.current = watched;
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }, [id, token]);

  // Load video from API
  useEffect(() => {
    async function loadVideo() {
      if (!id) return;
      try {
        const data = await videosApi.get(id);
        setVideo(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el video');
      } finally {
        setLoading(false);
      }
    }
    loadVideo();
  }, [id]);

  // Video event handlers
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleTimeUpdate = () => {
      const time = videoEl.currentTime;
      setCurrentTime(time);
      
      // Auto-save progress every 10 seconds
      if (time - lastSavedTime.current >= 10) {
        saveProgress(time);
      }
      
      // Mark as completed when 90% watched
      if (!isCompleted && duration > 0 && time >= duration * 0.9) {
        setIsCompleted(true);
        saveProgress(time, true);
      }
    };
    const handleLoadedMetadata = () => setDuration(videoEl.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      // Save progress on pause
      saveProgress(videoEl.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      if (!isCompleted) {
        setIsCompleted(true);
        saveProgress(videoEl.duration, true);
      }
    };

    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);
    videoEl.addEventListener('ended', handleEnded);

    return () => {
      // Save progress when leaving
      if (videoEl.currentTime > 0) {
        saveProgress(videoEl.currentTime);
      }
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
      videoEl.removeEventListener('ended', handleEnded);
    };
  }, [video, duration, isCompleted, saveProgress]);

  // Keyboard shortcuts for video player
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case 'arrowup':
          e.preventDefault();
          const newVolUp = Math.min(1, video.volume + 0.1); video.volume = newVolUp; setVolume(newVolUp);
          break;
        case 'arrowdown':
          e.preventDefault();
          const newVolDown = Math.max(0, video.volume - 0.1); video.volume = newVolDown; setVolume(newVolDown);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          video.currentTime = (parseInt(e.key) / 10) * video.duration;
          break;
        case '>':
          e.preventDefault();
          setPlaybackSpeed(prev => {
            const idx = PLAYBACK_SPEEDS.indexOf(prev);
            return idx < PLAYBACK_SPEEDS.length - 1 ? PLAYBACK_SPEEDS[idx + 1] : prev;
          });
          break;
        case '<':
          e.preventDefault();
          setPlaybackSpeed(prev => {
            const idx = PLAYBACK_SPEEDS.indexOf(prev);
            return idx > 0 ? PLAYBACK_SPEEDS[idx - 1] : prev;
          });
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted]);

  // Apply playback speed when changed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get video URL (handle relative paths from backend)
  const getVideoUrl = (url: string) => {
    if (url.startsWith('http')) {
      return url;
    }
    // Relative path from backend uploads
    return `http://localhost:3001${url}`;
  };

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') as 'comments' | 'notes' | 'quiz' | undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.24))]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.24))] text-center">
        <div className="text-red-400 text-lg mb-4">{error || 'Video no encontrado'}</div>
        <Link to="/videos" className="text-blue-400 hover:text-blue-300">
          ← Volver a videos
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-theme(spacing.24))] gap-6 animate-in fade-in duration-500 pb-6">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col min-h-0">
             <div className="mb-4">
                <Link to={video.module?.course ? `/courses/${video.module.course.id}` : '/videos'} className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors mb-2 text-sm">
                    <ArrowLeft size={16} className="mr-1" />
                    {video.module?.course ? `Volver a ${video.module.course.title}` : 'Volver a videos'}
                </Link>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">{video.title}</h2>
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                      <Check size={12} /> Completado
                    </span>
                  )}
                </div>
                {video.module && (
                  <p className="text-slate-600 text-sm mt-1">{video.module.title}</p>
                )}
             </div>

             <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl w-full aspect-video flex items-center justify-center group mb-6">
                 {/* Actual Video Player */}
                 <video
                   ref={videoRef}
                   src={getVideoUrl(video.videoUrl)}
                   className="w-full h-full object-contain"
                   poster={video.thumbnail || undefined}
                   onClick={togglePlay}
                 />
                 
                 {/* Play Button Overlay */}
                 {!isPlaying && (
                   <button 
                     onClick={togglePlay}
                     className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors"
                   >
                     <div className="w-20 h-20 rounded-full bg-blue-600/90 flex items-center justify-center shadow-2xl hover:bg-blue-500 transition-colors">
                       <Play size={40} className="text-white ml-1" />
                     </div>
                   </button>
                 )}
                 
                 {/* Controls Overlay */}
                 <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end min-h-[120px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-4 text-white" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                        <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                        <span className="text-white text-sm font-semibold w-28 tabular-nums">
                          {formatTime(currentTime)} / {formatTime(duration || video.duration || 0)}
                        </span>
                        <div 
                          className="flex-1 h-1.5 bg-slate-600/50 rounded-full cursor-pointer relative group/timeline" 
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const percentage = x / rect.width;
                            handleSeek(percentage * (duration || video.duration || 0));
                          }}
                        >
                             <div className="w-full h-full absolute inset-0 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 relative transition-all duration-100 ease-linear"
                                    style={{ width: `${((currentTime / (duration || video.duration || 1)) * 100)}%` }}
                                  />
                             </div>
                             <div 
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover/timeline:scale-100 transition-transform cursor-pointer"
                                style={{ left: `${((currentTime / (duration || video.duration || 1)) * 100)}%` }}
                             />
                        </div>
                        
                        {/* Speed Control */}
                        <div className="relative">
                          <button 
                            onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                            className="text-white hover:text-blue-400 cursor-pointer flex items-center gap-1 text-sm font-semibold"
                          >
                            <Settings size={18} />
                            <span>{playbackSpeed}x</span>
                          </button>
                          {showSpeedMenu && (
                            <div className="absolute bottom-full right-0 mb-2 bg-white border border-slate-300 rounded-lg overflow-hidden shadow-xl z-10">
                              {PLAYBACK_SPEEDS.map(speed => (
                                <button
                                  key={speed}
                                  onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false); }}
                                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors ${
                                    playbackSpeed === speed ? 'text-blue-400 bg-slate-100/50' : 'text-slate-900'
                                  }`}
                                >
                                  {speed}x {playbackSpeed === speed && <Check size={14} className="inline ml-2" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                                                                        <div className="relative group flex items-center h-full mr-4">
                          <button 
                            onClick={() => setShowVolumeSlider(!showVolumeSlider)} 
                            className="text-white hover:text-slate-200 transition-colors p-1"
                          >
                            {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                          </button>
                          <div className={`overflow-hidden transition-all duration-300 ease-out flex items-center ${showVolumeSlider ? 'w-24' : 'w-0'}`}>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="w-20 h-1 mx-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white hover:accent-white"
                            />
                          </div>
                        </div>
                        <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 cursor-pointer">
                          <Maximize size={20} />
                        </button>
                    </div>
                 </div>
             </div>
             {/* Summary Section */}
             {(video.summary || video.chapters) && (
               <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
                 {video.summary && (
                   <div className="mb-6">
                     <h3 className="text-lg font-bold text-slate-900 mb-3">Resumen</h3>
                     <p className="text-slate-600 leading-relaxed">{video.summary}</p>
                   </div>
                 )}
                 {video.chapters && (
                   <div>
                     <h3 className="text-lg font-bold text-slate-900 mb-3">Capítulos</h3>
                     <div className="space-y-2">
                       {(typeof video.chapters === 'string' ? JSON.parse(video.chapters) : video.chapters).map((chapter: { timestamp: number; title: string }, i: number) => (
                         <button
                           key={i}
                           onClick={() => handleSeek(chapter.timestamp)}
                           className="flex items-center gap-3 w-full text-left hover:bg-slate-50 p-2 rounded-lg transition-colors"
                         >
                           <span className="text-blue-600 font-mono text-sm">{formatTime(chapter.timestamp)}</span>
                           <span className="text-slate-700">{chapter.title}</span>
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             )}
        </div>

        {/* Sidebar Space */}
        <div className="w-full lg:w-96 bg-white rounded-xl border border-slate-200 p-4 flex flex-col h-[500px] lg:h-auto shadow-xl">
            <CommentSidebar currentTime={currentTime} onTimeClick={handleSeek} quiz={video.quiz} initialTab={initialTab} />
        </div>
    </div>
  );
}
