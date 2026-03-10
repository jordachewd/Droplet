import classNames from "classnames";
import Link from "next/link";
import { Persona } from "@/types/PersonaData.d";

interface PersonaCardProps {
  persona: Persona;
  href?: string;
  compact?: boolean;
}

export default function PersonaCard({
  persona,
  href,
  compact = false,
}: PersonaCardProps) {
  const cardClass = classNames(
    "PersonaCard flex h-full flex-col rounded-xl border p-4 transition-all duration-300",
    "border-lightBorders-400/70 bg-white/70 shadow-sm",
    "hover:-translate-y-1 hover:shadow-md",
    "dark:border-darkBorders-500 dark:bg-jwdMarine-900/70",
    compact ? "gap-2" : "gap-3",
  );

  const titleClass = classNames(
    "heading-6 flex items-center gap-2 leading-tight",
    compact ? "text-lg" : "text-xl",
  );

  const bodyClass = classNames(
    "body-2 text-left",
    compact ? "text-sm" : "text-[0.95rem]",
  );

  const cardBody = (
    <>
      <div className="flex items-center justify-between gap-3">
        <h3 className={titleClass}>
          <i className={classNames(persona.icon, "text-base")}></i>
          <span>{persona.label}</span>
        </h3>
        <span className="rounded-full border border-dotted px-2 py-1 text-xs">
          {persona.category}
        </span>
      </div>

      <p className="text-sm font-medium opacity-80">{persona.tagline}</p>
      <p className={bodyClass}>{persona.description}</p>

      {!compact && (
        <ul className="mt-auto flex flex-wrap gap-2 pt-2">
          <li className="rounded-full bg-lightSecondary-200 px-2 py-1 text-xxs dark:bg-darkSecondary-500/40">
            {persona.supportsImage ? "Image-enabled" : "Text-first"}
          </li>
          <li className="rounded-full bg-lightSecondary-200 px-2 py-1 text-xxs dark:bg-darkSecondary-500/40">
            {persona.supportsAudio ? "Audio-enabled" : "Audio off"}
          </li>
        </ul>
      )}
    </>
  );

  if (!href) {
    return <article className={cardClass}>{cardBody}</article>;
  }

  return (
    <Link href={href} className={cardClass}>
      {cardBody}
    </Link>
  );
}
