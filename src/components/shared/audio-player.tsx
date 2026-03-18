import classNames from "classnames";
import { useState, useEffect } from "react";
import { resolveStoredAssetUrl } from "@/lib/utils/aws/s3-file-reference";

interface AudioPlayerProps {
  audioSrc: string | null;
}

function formatTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

function isBase64AudioPayload(value: string): boolean {
  const trimmedValue = value.trim();

  if (
    !trimmedValue ||
    trimmedValue.startsWith("/") ||
    trimmedValue.startsWith("blob:") ||
    trimmedValue.startsWith("data:") ||
    /^https?:\/\//i.test(trimmedValue)
  ) {
    return false;
  }

  return /^[A-Za-z0-9+/]+=*$/.test(trimmedValue.replace(/\s+/g, ""));
}

function createLegacyAudioBlobUrl(base64Audio: string): string {
  const normalizedAudio = base64Audio.replace(/\s+/g, "");
  const byteCharacters = atob(normalizedAudio);
  const byteNumbers = new Uint8Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const blob = new Blob([byteNumbers], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

export default function AudioPlayer({ audioSrc }: AudioPlayerProps) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");

  useEffect(() => {
    setAudio(null);
    setPlaybackUrl(null);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime("0:00");
    setDuration("0:00");

    if (!audioSrc) {
      return;
    }

    let generatedBlobUrl: string | null = null;

    try {
      const resolvedAudioSrc = isBase64AudioPayload(audioSrc)
        ? (() => {
            generatedBlobUrl = createLegacyAudioBlobUrl(audioSrc);
            return generatedBlobUrl;
          })()
        : resolveStoredAssetUrl(audioSrc);

      setPlaybackUrl(resolvedAudioSrc);

      const audioElement = new Audio(resolvedAudioSrc);
      setAudio(audioElement);

      audioElement.onloadedmetadata = () => {
        setDuration(formatTime(audioElement.duration));
      };

      return () => {
        if (generatedBlobUrl) {
          URL.revokeObjectURL(generatedBlobUrl);
        }

        audioElement.pause();
        audioElement.onloadedmetadata = null;
      };
    } catch {}
  }, [audioSrc]);

  useEffect(() => {
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(formatTime(audio.currentTime));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime("0:00");
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audio]);

  const togglePlay = () => {
    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
        return;
      }
    }
  };

  const audioPlayerClass = classNames(
    "AudioPlayer mx-auto mt-3 flex w-full rounded-lg border shadow",
    "border-slate-500 bg-lavenderHaze-100",
    "dark:border-slate-500 dark:bg-nightIndigo-900",
  );

  const progressTrackClass = classNames(
    "flex h-2 flex-1 overflow-hidden rounded-full",
    "bg-slate-500 dark:bg-slate-600",
  );

  return (
    <div className={audioPlayerClass}>
      <div className="flex flex-1 items-center justify-between gap-4 p-4">
        <button
          type="button"
          onClick={togglePlay}
          className="btn btn-sm btn-outlined"
          disabled={!playbackUrl}
        >
          <i
            className={classNames(
              "bi mr-2",
              isPlaying ? "bi-pause" : "bi-play",
            )}
          ></i>
          {isPlaying ? "Pause" : "Play"}
        </button>

        <div className={progressTrackClass}>
          <div
            className="h-full bg-nightIndigo-600 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-sm">
          {currentTime} / {duration}
        </p>
      </div>
    </div>
  );
}
