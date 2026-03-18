"use client";

import classNames from "classnames";
import { resolveStoredAssetUrl } from "@/lib/utils/aws/s3-file-reference";

interface VideoPlayerProps {
  videoSrc: string | null;
}

export default function VideoPlayer({ videoSrc }: VideoPlayerProps) {
  const resolvedVideoSrc = videoSrc ? resolveStoredAssetUrl(videoSrc) : null;

  return (
    <div
      className={classNames(
        "VideoPlayer mt-3 overflow-hidden rounded-xl border",
        "border-slate-500 bg-lavenderHaze-100",
        "dark:border-slate-500 dark:bg-nightIndigo-900",
      )}
    >
      <video
        controls
        playsInline
        preload="metadata"
        className="h-auto w-full"
        src={resolvedVideoSrc ?? undefined}
      >
        Your browser does not support the video player.
      </video>
    </div>
  );
}
