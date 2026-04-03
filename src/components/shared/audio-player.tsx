import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
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

function AudioPlayerSession({ audioSrc }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousAudioUrlRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const safeProgress = Number.isFinite(progress)
    ? Math.min(100, Math.max(0, progress))
    : 0;
  const playbackControlLabel = isPlaying
    ? "Pause audio playback"
    : "Play audio playback";

  useEffect(() => {
    if (!audioSrc || previousAudioUrlRef.current === audioSrc) {
      return;
    }

    previousAudioUrlRef.current = audioSrc;
    let generatedBlobUrl: string | null = null;

    try {
      const resolvedAudioSrc = isBase64AudioPayload(audioSrc)
        ? (() => {
            generatedBlobUrl = createLegacyAudioBlobUrl(audioSrc);
            return generatedBlobUrl;
          })()
        : resolveStoredAssetUrl(audioSrc);

      const audioElement = new Audio(resolvedAudioSrc);
      audioRef.current = audioElement;

      audioElement.onloadedmetadata = () => {
        setDuration(formatTime(audioElement.duration));
      };
      const updateProgress = () => {
        if (audioElement.duration) {
          setProgress((audioElement.currentTime / audioElement.duration) * 100);
          setCurrentTime(formatTime(audioElement.currentTime));
        }
      };
      const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime("0:00");
      };
      const handleError = () => {
        setIsPlaying(false);
        setAudioError("Audio unavailable.");
      };
      audioElement.addEventListener("timeupdate", updateProgress);
      audioElement.addEventListener("ended", handleEnded);
      audioElement.addEventListener("error", handleError);

      return () => {
        previousAudioUrlRef.current = null;

        audioElement.pause();
        audioElement.src = "";
        audioElement.onloadedmetadata = null;
        audioElement.removeEventListener("timeupdate", updateProgress);
        audioElement.removeEventListener("ended", handleEnded);
        audioElement.removeEventListener("error", handleError);

        if (generatedBlobUrl) {
          URL.revokeObjectURL(generatedBlobUrl);
        }

        if (audioRef.current === audioElement) {
          audioRef.current = null;
        }
      };
    } catch (error) {
      // Audio initialization failed (invalid URL, decode error, browser restrictions).
      audioRef.current = null;
      previousAudioUrlRef.current = null;
      queueMicrotask(() => {
        setAudioError(
          error instanceof Error && error.name === "NotSupportedError"
            ? "Audio format is not supported."
            : "Audio unavailable.",
        );
      });
    }
  }, [audioSrc]);

  const togglePlay = () => {
    const audioElement = audioRef.current;

    if (!audioElement) {
      return;
    }

    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      setAudioError(null);
      audioElement
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
          setAudioError("Audio unavailable.");
        });
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
          disabled={!audioSrc}
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

        {audioError ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="status">
            {audioError}
          </p>
        ) : (
          <p className="text-sm" role="status" aria-live="polite">
            {currentTime} / {duration}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AudioPlayer({ audioSrc }: AudioPlayerProps) {
  return (
    <AudioPlayerSession
      key={audioSrc ?? "empty-audio-src"}
      audioSrc={audioSrc}
    />
  );
}
