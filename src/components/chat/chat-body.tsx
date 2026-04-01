import classNames from "classnames";
import Link from "next/link";
import { DEFAULT_PROMO_CONTENT, PromoContent } from "@/constants/promo-content";
import { ContentItem, Message } from "@/types";
import { useEffect, useMemo, useRef } from "react";
import autoAnimate from "@formkit/auto-animate";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LoadingBubbles from "@/components/shared/loading-bubbles";
import ImageHolder from "@/components/shared/image-holder";
import AudioPlayer from "@/components/shared/audio-player";
import VideoPlayer from "@/components/shared/video-player";
import { TaskEndAction, TaskEndedReason } from "@/types/TaskData.d";

interface ChatBodyProps {
  messages: Message[];
  personaLabel?: string;
  conversationEnded?: boolean;
  supportEmail: string;
  stopReasonMessages: Record<TaskEndedReason, string>;
  promoContent?: PromoContent;
  endState?: {
    stopReason: TaskEndedReason;
    endAction: TaskEndAction;
  } | null;
}

function renderAction({
  endAction,
  supportEmail,
  promoContent,
}: {
  endAction: TaskEndAction;
  supportEmail: string;
  promoContent: PromoContent;
}) {
  if (endAction === "start_new_conversation") {
    return (
      <Link href="/app/new" className="btn btn-sm btn-contained">
        {promoContent.chatStartConversationCta}
      </Link>
    );
  }

  if (endAction === "upgrade_plan") {
    return (
      <Link href="/app/plans" className="btn btn-sm btn-contained">
        {promoContent.chatUpgradePlanCta}
      </Link>
    );
  }

  return (
    <a href={`mailto:${supportEmail}`} className="btn btn-sm btn-contained">
      {promoContent.chatContactSupportCta}
    </a>
  );
}

function buildMessageFallbackKey(message: Message): string {
  const normalizedContent = Array.isArray(message.content)
    ? message.content
        .map((item) => {
          if (item.type === "text" || item.type === "temp") {
            return `${item.type}:${item.text ?? ""}`;
          }

          if (item.type === "image_url") {
            return `${item.type}:${item.image_url?.url ?? ""}`;
          }

          if (item.type === "audio_url") {
            return `${item.type}:${item.audio_url ?? ""}`;
          }

          if (item.type === "video_url") {
            return `${item.type}:${item.video_url ?? ""}`;
          }

          return item.type;
        })
        .join("|")
    : `${message.content ?? ""}`;

  return `${message.role}:${message.whois ?? "unknown"}:${normalizedContent}`;
}

function buildContentFallbackKey(content: ContentItem): string {
  if (content.type === "text" || content.type === "temp") {
    return `${content.type}:${content.text ?? ""}`;
  }

  if (content.type === "image_url") {
    return `${content.type}:${content.image_url?.url ?? ""}`;
  }

  if (content.type === "audio_url") {
    return `${content.type}:${content.audio_url ?? ""}`;
  }

  if (content.type === "video_url") {
    return `${content.type}:${content.video_url ?? ""}`;
  }

  return content.type;
}

export default function ChatBody({
  messages,
  personaLabel,
  supportEmail,
  stopReasonMessages,
  promoContent = DEFAULT_PROMO_CONTENT,
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
    const messageKeyCount = new Map<string, number>();

    return messages.map((message) => {
      const { whois, content } = message;
      const isBot = whois !== "user";

      const messageOwner = isBot ? personaLabel || "Assistant" : "Me";
      const messageKeyBase = message.id ?? buildMessageFallbackKey(message);

      const messageKeyIndex = messageKeyCount.get(messageKeyBase) ?? 0;
      messageKeyCount.set(messageKeyBase, messageKeyIndex + 1);

      const messageKey =
        messageKeyIndex === 0
          ? messageKeyBase
          : `${messageKeyBase}:${messageKeyIndex}`;

      const articleClass = classNames(
        "ChatBodyMessage flex items-start gap-3",
        isBot ? "justify-start" : "justify-end",
      );

      const avatarClass = classNames(isBot ? "bi bi-droplet" : "bi bi-person");

      const chatMarkdownClass = classNames("chat-markdown", {
        "chat-markdown--bot": isBot,
      });

      return (
        <article key={messageKey} className={articleClass}>
          <div className={chatMarkdownClass}>
            <div className="flex w-full gap-2 items-center mb-4">
              <i className={avatarClass} aria-hidden="true"></i>
              <span className="px-1 text-xxs font-semibold uppercase text-midnightBlue-700 dark:text-lavenderHaze-700">
                {messageOwner}
              </span>
            </div>

            {Array.isArray(content) ? (
              (() => {
                const contentKeyCount = new Map<string, number>();

                return content.map((reply) => {
                  const contentKeyBase = buildContentFallbackKey(reply);
                  const contentKeyIndex =
                    contentKeyCount.get(contentKeyBase) ?? 0;
                  contentKeyCount.set(contentKeyBase, contentKeyIndex + 1);
                  const contentKey =
                    contentKeyIndex === 0
                      ? contentKeyBase
                      : `${contentKeyBase}:${contentKeyIndex}`;

                  if (reply.type === "text") {
                    return (
                      <ReactMarkdown
                        key={contentKey}
                        remarkPlugins={[remarkGfm]}
                      >
                        {reply.text}
                      </ReactMarkdown>
                    );
                  }

                  if (reply.type === "image_url") {
                    return (
                      <ImageHolder
                        key={contentKey}
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
                        key={contentKey}
                        audioSrc={reply.audio_url || null}
                      />
                    );
                  }

                  if (reply.type === "video_url") {
                    return (
                      <VideoPlayer
                        key={contentKey}
                        videoSrc={reply.video_url || null}
                      />
                    );
                  }

                  if (reply.type === "temp") {
                    return <LoadingBubbles key={contentKey} size="small" />;
                  }

                  return null;
                });
              })()
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            )}
          </div>
        </article>
      );
    });
  }, [personaLabel, messages]);

  const chatBodyClass = classNames(
    "ChatBody mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 pb-10 pt-6",
  );

  const chatEndNoticeClass = classNames(
    "ChatBodyEndNotice mt-4 rounded-2xl p-4 text-sm shadow-sm border ",
    "border-amber-500/30 bg-amber-500/10 text-twilightPurple-500 dark:text-lavenderHaze-500",
  );

  return (
    <>
      <div className={chatBodyClass} ref={parent} aria-live="polite">
        {listMessages}

        {endState && (
          <article className={chatEndNoticeClass}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3">
                <span className="text-xxs font-semibold uppercase opacity-50">
                  {promoContent.chatConversationEndedLabel}
                </span>
                <p className="font-medium">
                  {stopReasonMessages[endState.stopReason]}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {renderAction({
                  endAction: endState.endAction,
                  supportEmail,
                  promoContent,
                })}
                {endState.endAction === "contact_support" && (
                  <span className="text-xs opacity-80">{supportEmail}</span>
                )}
              </div>
            </div>
          </article>
        )}
      </div>
      <div className="ScrollIntoViewRef flex w-full" ref={bottomRef} />
    </>
  );
}
