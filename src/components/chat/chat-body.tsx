import classNames from "classnames";
import { Message } from "@/types";
import { useEffect, useMemo, useRef } from "react";
import autoAnimate from "@formkit/auto-animate";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LoadingBubbles from "@/components/shared/loading-bubbles";
import ImageHolder from "@/components/shared/image-holder";
import AudioPlayer from "@/components/shared/audio-player";

interface ChatBodyProps {
  messages: Message[];
  personaLabel?: string;
}

export default function ChatBody({ messages, personaLabel }: ChatBodyProps) {
  const parent = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      if (parent.current) {
        autoAnimate(parent.current);
      }
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
          ? "bg-lightPrimary-100 dark:bg-darkPrimary-500/40"
          : "bg-lightSecondary-200 text-lightText-500 dark:bg-darkSecondary-500 dark:text-darkText-500",
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
  );

  return (
    <>
      <div className={chatBodyClass} ref={parent}>
        {listMessages}
      </div>
      <div className="flex h-2 w-full" ref={bottomRef}></div>
    </>
  );
}
