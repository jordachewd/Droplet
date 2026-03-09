import classNames from "classnames";
import { useState, useEffect } from "react";

interface AudioPlayerProps {
  audioSrc: string | null;
}

export default function AudioPlayer({ audioSrc }: AudioPlayerProps) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  useEffect(() => {
    if (audioSrc) {
      try {
        const byteCharacters = atob(audioSrc);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        const audioElement = new Audio(url);
        setAudio(audioElement);

        audioElement.onloadedmetadata = () => {
          setDuration(formatTime(audioElement.duration));
        };

        return () => {
          URL.revokeObjectURL(url);
          audioElement.pause();
          setAudio(null);
        };
      } catch (error) {
        console.error("Error processing audio:", error);
      }
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
      } else {
        audio
          .play()
          .catch((error) => console.error("Error playing audio:", error));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const audioPlayerClass = classNames(
    "AudioPlayer mx-auto mt-3 flex w-full rounded-lg border shadow",
    "border-lightBorders-500 bg-lightBackground-100",
    "dark:border-darkBorders-500 dark:bg-jwdMarine-900",
  );

  const progressTrackClass = classNames(
    "flex h-2 flex-1 overflow-hidden rounded-full",
    "bg-lightBorders-500 dark:bg-darkBorders-600",
  );

  return (
    <div className={audioPlayerClass}>
      <div className="flex flex-1 items-center justify-between gap-4 p-4">
        <button
          type="button"
          onClick={togglePlay}
          className="btn btn-sm btn-outlined"
          disabled={!blobUrl}
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
            className="h-full bg-darkSecondary-600 transition-all duration-150"
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
