"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import classNames from "classnames";
import LibraryDeleteButton from "@/components/chat/library-delete-button";
import { resolveStoredAssetUrl } from "@/lib/utils/aws/s3-file-reference";
import AudioPlayer from "@/components/shared/audio-player";
import {
  LibraryConversationCardItem,
  LibraryMediaCardItem,
  LibraryPaginationState,
  LibraryUploadCardItem,
} from "@/types/LibraryData.d";

interface LibraryTabsProps {
  conversations: LibraryConversationCardItem[];
  images: LibraryMediaCardItem[];
  audios: LibraryMediaCardItem[];
  uploads: LibraryUploadCardItem[];
  initialTabId?: LibraryTabId;
  conversationsPagination: LibraryPaginationState;
  imagesPagination: LibraryPaginationState;
  audiosPagination: LibraryPaginationState;
  uploadsPagination: LibraryPaginationState;
  hasLoadError?: boolean;
}

type LibraryTabId = "chats" | "images" | "audios" | "uploaded";

export default function LibraryTabs({
  conversations,
  images,
  audios,
  uploads,
  initialTabId = "chats",
  conversationsPagination,
  imagesPagination,
  audiosPagination,
  uploadsPagination,
  hasLoadError = false,
}: LibraryTabsProps) {
  const [activeTabId, setActiveTabId] = useState<LibraryTabId>(initialTabId);

  useEffect(() => {
    setActiveTabId(initialTabId);
  }, [initialTabId]);

  const tabs = useMemo(
    () => [
      { id: "chats" as const, label: "Chats", count: conversations.length },
      { id: "images" as const, label: "Images", count: images.length },
      { id: "audios" as const, label: "Audios", count: audios.length },
      { id: "uploaded" as const, label: "Uploaded", count: uploads.length },
    ],
    [audios.length, conversations.length, images.length, uploads.length],
  );

  const handleTabChange = (tabId: LibraryTabId) => {
    setActiveTabId(tabId);
  };

  const focusAndActivateTabAtIndex = (nextIndex: number) => {
    const nextTab = tabs[nextIndex];

    if (!nextTab) {
      return;
    }

    handleTabChange(nextTab.id);

    if (typeof document === "undefined") {
      return;
    }

    const tabButton = document.getElementById(`library-tab-${nextTab.id}`);

    if (tabButton instanceof HTMLButtonElement) {
      tabButton.focus();
    }
  };

  const handleTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (tabs.length === 0) {
      return;
    }

    const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    const fallbackIndex = activeIndex === -1 ? 0 : activeIndex;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAndActivateTabAtIndex((fallbackIndex + 1) % tabs.length);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAndActivateTabAtIndex(
        (fallbackIndex - 1 + tabs.length) % tabs.length,
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusAndActivateTabAtIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusAndActivateTabAtIndex(tabs.length - 1);
    }
  };

  return (
    <section className="LibraryTabs flex flex-col gap-6 w-full max-w-7xl mx-auto px-4">
      <div
        role="tablist"
        aria-label="Library content tabs"
        onKeyDown={handleTabListKeyDown}
        className={classNames(
          "flex w-full flex-wrap items-center gap-2 rounded-xl p-2",
          "bg-lavenderHaze-100/80 dark:bg-nightIndigo-900/70 shadow-sm",
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
              tabIndex={selected ? 0 : -1}
              className={classNames(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5",
                "hover:-translate-y-0.5 text-sm transition-all",
                selected
                  ? "bg-twilightPurple-500/80 text-lavenderHaze-200 dark:bg-dustyBlue-500/80 font-semibold"
                  : "bg-lavenderHaze-500/80 dark:bg-twilightPurple-900/80",
              )}
              onClick={() => handleTabChange(tab.id)}
            >
              <span>{tab.label}</span>
              <span
                className={classNames(
                  "rounded-full px-1.5 py-0.5 text-xxs opacity-75",
                  selected
                    ? "bg-twilightPurple-1000 dark:bg-nightIndigo-1000"
                    : "bg-twilightPurple-200 dark:bg-dustyBlue-1000/70",
                )}
              >
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
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {conversations.map((conversation) => (
                <article
                  key={conversation.id}
                  className={classNames(
                    "flex items-start gap-3 rounded-xl p-4 transition-all duration-300",
                    "bg-lavenderHaze-100/70 shadow-sm dark:bg-nightIndigo-900/70",
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
                        <i
                          className={conversation.personaIcon}
                          aria-hidden="true"
                        ></i>
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

            <LibraryPagination
              tabId="chats"
              pagination={conversationsPagination}
            />
          </>
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
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {images.map((item) => (
                <LibraryImageCard
                  key={`${item.taskId}-${item.url}`}
                  item={item}
                />
              ))}
            </div>

            <LibraryPagination tabId="images" pagination={imagesPagination} />
          </>
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
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {audios.map((item) => (
                <LibraryAudioCard
                  key={`${item.taskId}-${item.url}`}
                  item={item}
                />
              ))}
            </div>

            <LibraryPagination tabId="audios" pagination={audiosPagination} />
          </>
        )}
      </section>

      <section
        id="library-panel-uploaded"
        role="tabpanel"
        aria-labelledby="library-tab-uploaded"
        hidden={activeTabId !== "uploaded"}
      >
        {hasLoadError ? (
          <EmptyState
            title="Failed to load uploads"
            text="Please refresh and try again."
          />
        ) : uploads.length === 0 ? (
          <EmptyState
            title="No uploaded files yet"
            text="Files you upload will appear here with download links."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {uploads.map((item) => (
                <LibraryUploadCard key={item.id} item={item} />
              ))}
            </div>

            <LibraryPagination
              tabId="uploaded"
              pagination={uploadsPagination}
            />
          </>
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
        "border-slate-400 bg-lavenderHaze-100/80",
        "dark:border-slate-500 dark:bg-nightIndigo-900/80",
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
            <i className={item.personaIcon} aria-hidden="true"></i>
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
              "border-slate-400 hover:bg-lavenderHaze-300/70",
              "dark:border-slate-500 dark:hover:bg-nightIndigo-500/30",
            )}
          >
            <i className="bi bi-arrows-fullscreen" aria-hidden="true"></i>
            Preview
          </a>

          <a
            href={downloadImageUrl}
            className={classNames(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
              "border-slate-400 hover:bg-lavenderHaze-300/70",
              "dark:border-slate-500 dark:hover:bg-nightIndigo-500/30",
            )}
          >
            <i className="bi bi-download" aria-hidden="true"></i>
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
        "border-slate-400 bg-lavenderHaze-100/80",
        "dark:border-slate-500 dark:bg-nightIndigo-900/80",
      )}
    >
      <div
        className={classNames(
          "mb-3 flex h-20 items-center justify-between rounded-lg border px-3",
          "border-slate-400 bg-lavenderHaze-300/40",
          "dark:border-slate-500 dark:bg-nightIndigo-500/20",
        )}
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <i className="bi bi-mic-fill" aria-hidden="true"></i>
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

      <AudioPlayer audioSrc={resolvedAudioUrl} />

      <div className="mt-3 flex items-center justify-between text-xs opacity-80">
        <span className="inline-flex items-center gap-1.5">
          <i className={item.personaIcon} aria-hidden="true"></i>
          {item.personaLabel}
        </span>
        <span>{item.createdAtLabel}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <a
          href={downloadAudioUrl}
          className={classNames(
            "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
            "border-slate-400 hover:bg-lavenderHaze-300/70",
            "dark:border-slate-500 dark:hover:bg-nightIndigo-500/30",
          )}
        >
          <i className="bi bi-download" aria-hidden="true"></i>
          Download
        </a>
      </div>
    </article>
  );
}

function formatUploadSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getUploadFileIcon(contentType: string): string {
  const normalizedContentType = contentType.toLowerCase();

  if (normalizedContentType.includes("pdf")) {
    return "bi bi-file-earmark-pdf";
  }

  if (normalizedContentType.includes("zip")) {
    return "bi bi-file-earmark-zip";
  }

  if (normalizedContentType.includes("json")) {
    return "bi bi-file-earmark-code";
  }

  if (
    normalizedContentType.includes("text") ||
    normalizedContentType.includes("markdown")
  ) {
    return "bi bi-file-earmark-text";
  }

  return "bi bi-file-earmark";
}

function LibraryUploadCard({ item }: { item: LibraryUploadCardItem }) {
  const downloadUploadUrl = resolveStoredAssetUrl(item.url, {
    download: true,
    filename: item.fileName,
  });
  const normalizedContentType = item.contentType.toLowerCase();
  const isImageUpload = normalizedContentType.startsWith("image/");
  const previewUrl = isImageUpload ? resolveStoredAssetUrl(item.url) : null;

  return (
    <article
      className={classNames(
        "LibraryUploadCard rounded-xl border p-4",
        "border-slate-400 bg-lavenderHaze-100/80",
        "dark:border-slate-500 dark:bg-nightIndigo-900/80",
      )}
    >
      <div
        className={classNames(
          "LibraryUploadCardPreview mb-3 flex h-28 items-center justify-center overflow-hidden rounded-lg border",
          "border-slate-400 bg-lavenderHaze-300/40",
          "dark:border-slate-500 dark:bg-nightIndigo-500/20",
        )}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={`Uploaded file preview for ${item.fileName}`}
            width={360}
            height={180}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <i
            className={classNames(
              "text-4xl opacity-80",
              getUploadFileIcon(item.contentType),
            )}
            aria-hidden="true"
          ></i>
        )}
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="line-clamp-1 text-sm font-semibold">{item.fileName}</h3>
        <span className="text-xs opacity-80">{item.createdAtLabel}</span>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs opacity-80">
        <span>{item.contentType}</span>
        <span>{formatUploadSize(item.sizeBytes)}</span>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={downloadUploadUrl}
          className={classNames(
            "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
            "border-slate-400 hover:bg-lavenderHaze-300/70",
            "dark:border-slate-500 dark:hover:bg-nightIndigo-500/30",
          )}
        >
          <i className="bi bi-download" aria-hidden="true"></i>
          Download
        </a>

        {item.href ? (
          <Link
            href={item.href}
            className={classNames(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
              "border-slate-400 hover:bg-lavenderHaze-300/70",
              "dark:border-slate-500 dark:hover:bg-nightIndigo-500/30",
            )}
          >
            <i className="bi bi-chat-left-text" aria-hidden="true"></i>
            Open conversation
          </Link>
        ) : null}
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
        "rounded-2xl border border-dashed p-10 text-center shadow-sm",
        "bg-lavenderHaze-100/70 dark:bg-nightIndigo-900/70",
      )}
    >
      <h2 className="heading-5">{title}</h2>
      <p className="body-2 mt-3">{text}</p>

      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className={classNames(
            "mt-5 inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition-all",
            "border-slate-400 bg-lavenderHaze-100/80 hover:-translate-y-0.5 hover:bg-lavenderHaze-300/70",
            "dark:border-slate-500 dark:bg-nightIndigo-900/80 dark:hover:bg-nightIndigo-500/30",
          )}
        >
          {ctaLabel}
        </Link>
      )}
    </article>
  );
}

function LibraryPagination({
  tabId,
  pagination,
}: {
  tabId: Extract<LibraryTabId, "chats" | "images" | "audios" | "uploaded">;
  pagination: LibraryPaginationState;
}) {
  if (!pagination.hasPreviousPage && !pagination.hasNextPage) {
    return null;
  }

  const pageParamByTab = {
    chats: "chatsPage",
    images: "imagesPage",
    audios: "audiosPage",
    uploaded: "uploadedPage",
  } as const;

  const pageParamName = pageParamByTab[tabId];

  const buildHref = (nextPage: number): string => {
    const params = new URLSearchParams({
      tab: tabId,
      [pageParamName]: String(nextPage),
    });

    return `/app/library?${params.toString()}`;
  };

  return (
    <nav
      aria-label={`${tabId} pagination`}
      className="mt-4 flex items-center justify-end gap-2"
    >
      {pagination.hasPreviousPage ? (
        <Link
          href={buildHref(pagination.currentPage - 1)}
          className={classNames(
            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
            "border-slate-400 bg-lavenderHaze-100/80 hover:bg-lavenderHaze-300/70",
            "dark:border-slate-500 dark:bg-nightIndigo-900/80 dark:hover:bg-nightIndigo-500/30",
          )}
        >
          Previous
        </Link>
      ) : (
        <span
          className={classNames(
            "rounded-lg border px-3 py-1.5 text-sm font-medium opacity-50",
            "border-slate-400 dark:border-slate-500",
          )}
          aria-hidden
        >
          Previous
        </span>
      )}

      <span className="px-2 text-sm opacity-80">
        Page {pagination.currentPage}
      </span>

      {pagination.hasNextPage ? (
        <Link
          href={buildHref(pagination.currentPage + 1)}
          className={classNames(
            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
            "border-slate-400 bg-lavenderHaze-100/80 hover:bg-lavenderHaze-300/70",
            "dark:border-slate-500 dark:bg-nightIndigo-900/80 dark:hover:bg-nightIndigo-500/30",
          )}
        >
          Next
        </Link>
      ) : (
        <span
          className={classNames(
            "rounded-lg border px-3 py-1.5 text-sm font-medium opacity-50",
            "border-slate-400 dark:border-slate-500",
          )}
          aria-hidden
        >
          Next
        </span>
      )}
    </nav>
  );
}
