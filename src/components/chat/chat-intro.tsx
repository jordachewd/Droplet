"use client";

import { useUser } from "@clerk/nextjs";
import classNames from "classnames";
import LoadingBubbles from "@/components/shared/loading-bubbles";
import type { Persona } from "@/types/PersonaData.d";

interface ChatIntroProps {
  persona: Persona;
  sendPrompt: (prompt: string) => void;
}

export default function ChatIntro({ persona, sendPrompt }: ChatIntroProps) {
  const { user, isLoaded } = useUser();

  const introWrapperClass = classNames(
    "ChatIntro mx-auto flex w-full max-w-4xl flex-col gap-8",
  );

  const introPromptButtonClass = classNames(
    "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all",
    "border-slate-400 hover:bg-lavenderHaze-200/60 dark:border-slate-500 dark:hover:bg-nightIndigo-500/25",
  );

  function handleSendPrompt(prompt: string) {
    sendPrompt(prompt);
  }

  if (!isLoaded) {
    return (
      <div className={introWrapperClass}>
        <div className="flex justify-center items-center min-h-[35vh]">
          <LoadingBubbles size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={introWrapperClass}>
      <div className="ChatIntroHead flex flex-col gap-2 justify-center items-center">
        <h1 className="heading-2">Hello {user?.firstName || "there"},</h1>
        <h2 className="heading-5">welcome to your chat dashboard.</h2>
        <p className="body-2">
          Active persona: <strong>{persona.label}</strong> - {persona.tagline}
        </p>
      </div>

      <div className="ChatIntroPrompts grid grid-cols-1 gap-3 md:grid-cols-2">
        {persona.starterPrompts.map((prompt) => (
          <button
            key={`${persona.id}-${prompt}`}
            type="button"
            onClick={() => handleSendPrompt(prompt)}
            className={introPromptButtonClass}
          >
            <i
              className={classNames("bi bi-lightning-charge text-base")}
              aria-hidden="true"
            ></i>
            <span>{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
