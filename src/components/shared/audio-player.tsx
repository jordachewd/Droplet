import classNames from "classnames";
import { useState, useEffect } from "react";
import { resolveStoredAssetUrl } from "@/lib/utils/aws/s3-file-reference";
import Button from "@/components/shared/button";

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
  const safeProgress = Number.isFinite(progress)
    ? Math.min(100, Math.max(0, progress))
    : 0;
  const playbackControlLabel = isPlaying
    ? "Pause audio playback"
    : "Play audio playback";

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
    } catch {
      setAudio(null);
      setPlaybackUrl(null);
    }
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
        <Button
          type="button"
          onClick={togglePlay}
          variant="outlined"
          size="sm"
          disabled={!playbackUrl}
          aria-label={playbackControlLabel}
        >
          <i
            className={classNames(
              "bi mr-2",
              isPlaying ? "bi-pause" : "bi-play",
            )}
            aria-hidden="true"
          ></i>
          {isPlaying ? "Pause" : "Play"}
        </Button>

        <div
          className={progressTrackClass}
          role="progressbar"
          aria-label="Audio playback progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(safeProgress)}
          aria-valuetext={`${currentTime} of ${duration}`}
        >
          <div
            className="h-full bg-nightIndigo-600 transition-all duration-150"
            style={{ width: `${safeProgress}%` }}
            aria-hidden="true"
          />
        </div>

        <p className="text-sm" role="status" aria-live="polite">
          {currentTime} / {duration}
        </p>
      </div>
    </div>
  );
}
