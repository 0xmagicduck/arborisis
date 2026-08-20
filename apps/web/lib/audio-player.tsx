"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Un seul `<audio>` partagé par toute l'app : jouer un enregistrement met
 * automatiquement en pause le précédent (pas de lecture simultanée), voir
 * design/handoff/DEV-HANDOFF.md §2.2 (PlayButton) et §6 (transitions play/pause).
 */
export interface PlayableRecording {
  id: string;
  title: string;
  /** URL de lecture — proxy Opus si disponible, sinon original. `null` → PlayButton désactivé (§5, "offline / son indisponible"). */
  url: string | null;
}

interface AudioPlayerState {
  playingId: string | null;
  isLoading: boolean;
  progress: number; // 0-1
  currentTimeSeconds: number;
  durationSeconds: number;
  toggle: (recording: PlayableRecording) => void;
  isPlaying: (id: string) => boolean;
}

const AudioPlayerContext = createContext<AudioPlayerState | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTimeSeconds(audio.currentTime);
      if (audio.duration > 0) setProgress(audio.currentTime / audio.duration);
    };
    const onLoadedMetadata = () => setDurationSeconds(audio.duration || 0);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onEnded = () => {
      setPlayingId(null);
      setProgress(0);
      setCurrentTimeSeconds(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, []);

  const toggle = useCallback(
    (recording: PlayableRecording) => {
      const audio = audioRef.current;
      if (!audio || !recording.url) return;

      if (playingId === recording.id) {
        audio.pause();
        setPlayingId(null);
        return;
      }

      if (audio.src !== recording.url) {
        audio.src = recording.url;
        setProgress(0);
        setCurrentTimeSeconds(0);
        setDurationSeconds(0);
      }
      setIsLoading(true);
      audio
        .play()
        .then(() => setIsLoading(false))
        .catch(() => setIsLoading(false));
      setPlayingId(recording.id);
    },
    [playingId]
  );

  const isPlaying = useCallback((id: string) => playingId === id, [playingId]);

  return (
    <AudioPlayerContext.Provider
      value={{ playingId, isLoading, progress, currentTimeSeconds, durationSeconds, toggle, isPlaying }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerState {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer doit être utilisé sous AudioPlayerProvider (voir app/providers.tsx)");
  return ctx;
}
