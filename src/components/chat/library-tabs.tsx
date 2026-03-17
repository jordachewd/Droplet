"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import classNames from "classnames";
import LibraryDeleteButton from "@/components/chat/library-delete-button";
import { resolveStoredAssetUrl } from "@/lib/utils/aws/s3-file-reference";

export interface LibraryConversationCardItem {
  id: string;
  title: string;
  personaLabel: string;
  personaIcon: string;
  updatedAtLabel: string;
  href: string;
}

export interface LibraryMediaCardItem {
  url: string;
  taskId: string;
  taskTitle: string;
  personaLabel: string;
  personaIcon: string;
  createdAtLabel: string;
  href: string;
}

interface LibraryTabsProps {
  conversations: LibraryConversationCardItem[];
  images: LibraryMediaCardItem[];
  audios: LibraryMediaCardItem[];
  videos: LibraryMediaCardItem[];
  hasLoadError?: boolean;
}

type LibraryTabId = "chats" | "images" | "audios" | "videos";

export default function LibraryTabs({
  conversations,
  images,
  audios,
  videos,
  hasLoadError = false,
}: LibraryTabsProps) {
  const [activeTabId, setActiveTabId] = useState<LibraryTabId>("chats");

  const tabs = useMemo(
    () => [
      { id: "chats" as const, label: "Chats", count: conversations.length },
      { id: "images" as const, label: "Images", count: images.length },
      { id: "audios" as const, label: "Audios", count: audios.length },
      { id: "videos" as const, label: "Videos", count: videos.length },
    ],
    [audios.length, conversations.length, images.length, videos.length],
  );

  return (
    <section className="LibraryTabs flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Library content tabs"
        className={classNames(
          "flex w-full flex-wrap items-center gap-2 rounded-xl border p-2",
          "border-lightBorders-400 bg-white/80",
          "dark:border-darkBorders-500 dark:bg-jwdMarine-900/70",
        )}
      >
        {tabs.map((tab) => {
          const selected = activeTabId === tab.id;

          return (
            <button
              key={tab.id}
              id={`library-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`library-panel-${tab.id}`}
              className={classNames(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all",
                "border-lightBorders-400 hover:-translate-y-0.5",
                "dark:border-darkBorders-500",
                selected
                  ? "bg-lightPrimary-200/80 font-semibold dark:bg-darkPrimary-500/30"
                  : "bg-white/80 dark:bg-jwdMarine-900/80",
              )}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="rounded-full border border-dotted px-2 py-0.5 text-xxs opacity-75">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <section
        id="library-panel-chats"
        role="tabpanel"
        aria-labelledby="library-tab-chats"
        hidden={activeTabId !== "chats"}
      >
        {hasLoadError ? (
          <EmptyState
            title="Failed to load library"
            text="Please refresh and try again."
          />
        ) : conversations.length === 0 ? (
          <EmptyState
            title="No saved conversations yet"
            text="Conversations appear here after you send prompts in the app."
            ctaHref="/app/new"
            ctaLabel="Start a conversation"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {conversations.map((conversation) => (
              <article
                key={conversation.id}
                className={classNames(
                  "flex items-start gap-3 rounded-xl border p-4 transition-all duration-300",
                  "border-lightBorders-400 bg-white/70 shadow-sm",
                  "dark:border-darkBorders-500 dark:bg-jwdMarine-900/70",
                )}
              >
                <Link
                  href={conversation.href}
                  className={classNames(
                    "min-w-0 flex-1 rounded-lg transition-all duration-300",
                    "hover:-translate-y-0.5 hover:shadow-md",
                  )}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <h2 className="heading-6 truncate text-lg">
                      {conversation.title}
                    </h2>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm opacity-80">
                    <span className="inline-flex items-center gap-2">
                      <i className={conversation.personaIcon}></i>
                      {conversation.personaLabel}
                    </span>
                    <span className="shrink-0">
                      {conversation.updatedAtLabel}
                    </span>
                  </div>
                </Link>

                <LibraryDeleteButton
                  conversationId={conversation.id}
                  conversationTitle={conversation.title}
                />
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        id="library-panel-images"
        role="tabpanel"
        aria-labelledby="library-tab-images"
        hidden={activeTabId !== "images"}
      >
        {hasLoadError ? (
          <EmptyState
            title="Failed to load images"
            text="Please refresh and try again."
          />
        ) : images.length === 0 ? (
          <EmptyState
            title="No generated images yet"
            text="Image generations will appear here with conversation context."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((item) => (
              <LibraryImageCard
                key={`${item.taskId}-${item.url}`}
                item={item}
              />
            ))}
          </div>
        )}
      </section>

      <section
        id="library-panel-audios"
        role="tabpanel"
        aria-labelledby="library-tab-audios"
        hidden={activeTabId !== "audios"}
      >
        {hasLoadError ? (
          <EmptyState
            title="Failed to load audios"
            text="Please refresh and try again."
          />
        ) : audios.length === 0 ? (
          <EmptyState
            title="No generated audios yet"
            text="Audio generations will appear here with quick playback controls."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {audios.map((item) => (
              <LibraryAudioCard
                key={`${item.taskId}-${item.url}`}
                item={item}
              />
            ))}
          </div>
        )}
      </section>

      <section
        id="library-panel-videos"
        role="tabpanel"
        aria-labelledby="library-tab-videos"
        hidden={activeTabId !== "videos"}
      >
        {hasLoadError ? (
          <EmptyState
            title="Failed to load videos"
            text="Please refresh and try again."
          />
        ) : (
          <EmptyState
            title="Video Library Coming Soon"
            text="Video generation is gated pending Sora API verification."
          />
        )}
      </section>
    </section>
  );
}

function LibraryImageCard({ item }: { item: LibraryMediaCardItem }) {
  const resolvedImageUrl = resolveStoredAssetUrl(item.url);
  const downloadImageUrl = resolveStoredAssetUrl(item.url, { download: true });

  return (
    <article
      className={classNames(
        "LibraryImageCard overflow-hidden rounded-xl border",
        "border-lightBorders-400 bg-white/80",
        "dark:border-darkBorders-500 dark:bg-jwdMarine-900/80",
      )}
    >
      <Link href={item.href} className="block">
        <Image
          src={resolvedImageUrl}
          alt={`Generated image from ${item.taskTitle}`}
          width={720}
          height={480}
          unoptimized
          className="h-48 w-full object-cover"
        />
      </Link>

      <div className="space-y-3 p-3">
        <Link
          href={item.href}
          className="line-clamp-1 text-sm font-semibold hover:underline"
        >
          {item.taskTitle}
        </Link>

        <div className="flex items-center justify-between text-xs opacity-80">
          <span className="inline-flex items-center gap-1.5">
            <i className={item.personaIcon}></i>
            {item.personaLabel}
          </span>
          <span>{item.createdAtLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={resolvedImageUrl}
            target="_blank"
            rel="noreferrer"
            className={classNames(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
              "border-lightBorders-400 hover:bg-lightSecondary-300/70",
              "dark:border-darkBorders-500 dark:hover:bg-darkSecondary-500/30",
            )}
          >
            <i className="bi bi-arrows-fullscreen"></i>
            Preview
          </a>

          <a
            href={downloadImageUrl}
            className={classNames(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
              "border-lightBorders-400 hover:bg-lightSecondary-300/70",
              "dark:border-darkBorders-500 dark:hover:bg-darkSecondary-500/30",
            )}
          >
            <i className="bi bi-download"></i>
            Download
          </a>
        </div>
      </div>
    </article>
  );
}

function LibraryAudioCard({ item }: { item: LibraryMediaCardItem }) {
  const resolvedAudioUrl = resolveStoredAssetUrl(item.url);
  const downloadAudioUrl = resolveStoredAssetUrl(item.url, { download: true });

  return (
    <article
      className={classNames(
        "LibraryAudioCard rounded-xl border p-4",
        "border-lightBorders-400 bg-white/80",
        "dark:border-darkBorders-500 dark:bg-jwdMarine-900/80",
      )}
    >
      <div
        className={classNames(
          "mb-3 flex h-20 items-center justify-between rounded-lg border px-3",
          "border-lightBorders-400 bg-lightSecondary-300/40",
          "dark:border-darkBorders-500 dark:bg-darkSecondary-500/20",
        )}
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <i className="bi bi-mic-fill"></i>
          Audio generation
        </span>

        <span className="inline-flex items-end gap-1" aria-hidden>
          <span className="h-3 w-1 rounded-full bg-current opacity-50"></span>
          <span className="h-5 w-1 rounded-full bg-current opacity-70"></span>
          <span className="h-7 w-1 rounded-full bg-current opacity-90"></span>
          <span className="h-4 w-1 rounded-full bg-current opacity-60"></span>
        </span>
      </div>

      <Link
        href={item.href}
        className="mb-3 line-clamp-1 block text-sm font-semibold hover:underline"
      >
        {item.taskTitle}
      </Link>

      <audio controls src={resolvedAudioUrl} className="w-full" preload="none">
        Your browser does not support the audio player.
      </audio>

      <div className="mt-3 flex items-center justify-between text-xs opacity-80">
        <span className="inline-flex items-center gap-1.5">
          <i className={item.personaIcon}></i>
          {item.personaLabel}
        </span>
        <span>{item.createdAtLabel}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <a
          href={downloadAudioUrl}
          className={classNames(
            "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
            "border-lightBorders-400 hover:bg-lightSecondary-300/70",
            "dark:border-darkBorders-500 dark:hover:bg-darkSecondary-500/30",
          )}
        >
          <i className="bi bi-download"></i>
          Download
        </a>
      </div>
    </article>
  );
}

function EmptyState({
  title,
  text,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  text: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <article
      className={classNames(
        "rounded-2xl border border-dashed p-8 text-center shadow-sm",
        "border-lightBorders-400 bg-white/70",
        "dark:border-darkBorders-500 dark:bg-jwdMarine-900/70",
      )}
    >
      <h2 className="heading-5">{title}</h2>
      <p className="body-2 mt-3">{text}</p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className={classNames(
            "mt-5 inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition-all",
            "border-lightBorders-400 bg-white/80 hover:-translate-y-0.5 hover:bg-lightSecondary-300/70",
            "dark:border-darkBorders-500 dark:bg-jwdMarine-900/80 dark:hover:bg-darkSecondary-500/30",
          )}
        >
          {ctaLabel}
        </Link>
      )}
    </article>
  );
}
