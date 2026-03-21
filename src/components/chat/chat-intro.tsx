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

  function handleSendPrompt(prompt: string) {
    sendPrompt(prompt);
  }

  if (!isLoaded) {
    return (
      <section className="ChatIntro flex w-full items-center justify-center">
        <LoadingBubbles size="large" />
      </section>
    );
  }

  const introWrapperClass = classNames(
    "ChatIntro mx-auto flex w-full max-w-4xl flex-col gap-12 p-6",
  );

  const introPromptButtonClass = classNames(
    "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all",
    "border-slate-400 hover:bg-lavenderHaze-200/60",
    "dark:border-slate-500 dark:hover:bg-nightIndigo-500/25",
  );

  return (
    <section className={introWrapperClass}>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="heading-5">
          Hello {user?.firstName || "there"}, welcome to your chat dashboard.
        </h1>
        <p className="body-2">
          Active persona: <strong>{persona.label}</strong> - {persona.tagline}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {persona.starterPrompts.map((prompt, index) => (
          <button
            key={`${persona.id}-${index}`}
            type="button"
            onClick={() => handleSendPrompt(prompt)}
            className={introPromptButtonClass}
          >
            <i className={classNames("bi bi-lightning-charge text-base")}></i>
            <span>{prompt}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
