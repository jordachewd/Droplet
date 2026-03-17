import classNames from "classnames";
import Link from "next/link";
import { Message } from "@/types";
import { useEffect, useMemo, useRef } from "react";
import autoAnimate from "@formkit/auto-animate";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LoadingBubbles from "@/components/shared/loading-bubbles";
import ImageHolder from "@/components/shared/image-holder";
import AudioPlayer from "@/components/shared/audio-player";
import VideoPlayer from "@/components/shared/video-player";
import { TaskEndAction, TaskEndedReason } from "@/types/TaskData.d";
import { SUPPORT_EMAIL } from "@/constants/support";

interface ChatBodyProps {
  messages: Message[];
  personaLabel?: string;
  conversationEnded?: boolean;
  endState?: {
    stopReason: TaskEndedReason;
    endAction: TaskEndAction;
  } | null;
}

const stopReasonTitles: Record<TaskEndedReason, string> = {
  prompt_limit_reached:
    "You've reached the message limit for this conversation.",
  trial_limit_reached:
    "You've reached the trial limit for this persona conversation.",
  media_limit_reached: "You've reached your media generation limit.",
  daily_conversation_limit_reached:
    "You've reached the daily conversation limit for your plan.",
  conversation_storage_limit_reached:
    "This conversation has reached its storage limit.",
  billing_state_invalid: "Your plan has expired.",
};

function renderAction(endAction: TaskEndAction) {
  if (endAction === "start_new_conversation") {
    return (
      <Link
        href="/app/new"
        className="inline-flex items-center rounded-full border border-emerald-500/60 bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Start a new conversation
      </Link>
    );
  }

  if (endAction === "upgrade_plan") {
    return (
      <Link
        href="/app/plans"
        className="inline-flex items-center rounded-full border border-sky-500/60 bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Upgrade your plan
      </Link>
    );
  }

  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className="inline-flex items-center rounded-full border border-amber-500/60 px-3 py-1.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-500/10"
    >
      Contact support
    </a>
  );
}

export default function ChatBody({
  messages,
  personaLabel,
  conversationEnded = false,
  endState = null,
}: ChatBodyProps) {
  const parent = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!parent.current) {
      return;
    }

    const stopAutoAnimate = autoAnimate(parent.current);

    return () => {
      stopAutoAnimate.disable();
      stopAutoAnimate.destroy?.();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const listMessages = useMemo(() => {
    return messages.map((message, index) => {
      const { whois, content } = message;
      const isBot = whois !== "user";
      const messageOwner = isBot ? personaLabel || "Assistant" : "You";

      const articleClass = classNames(
        "ChatBodyMessage flex items-start gap-3",
        isBot ? "justify-start" : "justify-end",
      );

      const avatarClass = classNames(
        isBot ? "bi bi-robot" : "bi bi-person",
        "rounded-full p-2 text-base leading-none shadow-sm",
        isBot
          ? "bg-lightBackground-100 dark:bg-darkBackground-500/40"
          : "bg-lightBackground-200 text-lightText-500 dark:bg-darkBackground-500 dark:text-darkText-500",
      );

      const chatMarkdownClass = classNames("chat-markdown", {
        "chat-markdown--bot": isBot,
      });

      return (
        <article key={`${message.role}-${index}`} className={articleClass}>
          <i className={avatarClass}></i>

          <div className="flex max-w-[92%] flex-col gap-1">
            <span className="px-1 text-xxs font-semibold uppercase opacity-65">
              {messageOwner}
            </span>

            <div className={chatMarkdownClass}>
              {Array.isArray(content) ? (
                content.map((reply, contentIndex) => {
                  if (reply.type === "text") {
                    return (
                      <ReactMarkdown
                        key={contentIndex}
                        remarkPlugins={[remarkGfm]}
                      >
                        {reply.text}
                      </ReactMarkdown>
                    );
                  }

                  if (reply.type === "image_url") {
                    return (
                      <ImageHolder
                        key={contentIndex}
                        hasTools={isBot}
                        src={reply.image_url?.url || ""}
                        width={isBot ? 320 : 128}
                        height={isBot ? 320 : 128}
                      />
                    );
                  }

                  if (reply.type === "audio_url") {
                    return (
                      <AudioPlayer
                        key={contentIndex}
                        audioSrc={reply.audio_url || null}
                      />
                    );
                  }

                  if (reply.type === "video_url") {
                    return (
                      <VideoPlayer
                        key={contentIndex}
                        videoSrc={reply.video_url || null}
                      />
                    );
                  }

                  if (reply.type === "temp") {
                    return <LoadingBubbles key={contentIndex} size="small" />;
                  }

                  return null;
                })
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </article>
      );
    });
  }, [personaLabel, messages]);

  const chatBodyClass = classNames(
    "ChatBody mx-auto flex w-full max-w-screen-lg flex-1 flex-col gap-4 px-4 pb-10 pt-6",
    "lg:px-0",
    conversationEnded &&
      "rounded-2xl border border-amber-400/45 bg-amber-50/40 dark:border-amber-400/30 dark:bg-amber-500/5",
  );

  return (
    <>
      <div className={chatBodyClass} ref={parent}>
        {listMessages}

        {endState && (
          <aside className="ChatBodyEndNotice mt-2 rounded-2xl border border-dashed border-amber-500/60 bg-amber-100/85 p-4 text-sm text-amber-950 shadow-sm dark:bg-amber-500/10 dark:text-amber-50">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xxs font-semibold uppercase tracking-[0.18em] opacity-75">
                  Conversation Ended
                </span>
                <p className="font-medium">
                  {stopReasonTitles[endState.stopReason]}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {renderAction(endState.endAction)}
                {endState.endAction === "contact_support" && (
                  <span className="text-xs opacity-80">{SUPPORT_EMAIL}</span>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
      <div className="flex h-2 w-full" ref={bottomRef}></div>
    </>
  );
}
