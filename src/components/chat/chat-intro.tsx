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
    "ChatIntro mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-2xl border p-6 shadow-sm",
    "border-lightBorders-400 bg-white/75",
    "dark:border-darkBorders-500 dark:bg-jwdMarine-900/70",
  );

  const introPromptButtonClass = classNames(
    "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all",
    "border-lightBorders-400 hover:bg-lightSecondary-200/60",
    "dark:border-darkBorders-500 dark:hover:bg-darkSecondary-500/25",
  );

  return (
    <section className={introWrapperClass}>
      <div className="flex flex-col gap-2">
        <h1 className="heading-5">
          Hello {user?.firstName || "there"}, welcome to your chat dashboard.
        </h1>
        <p className="body-2 opacity-85">
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
