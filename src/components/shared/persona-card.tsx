import classNames from "classnames";
import Link from "next/link";
import Image from "next/image";
import { Persona } from "@/types/PersonaData.d";

interface PersonaCardProps {
  persona: Persona;
  href?: string;
  compact?: boolean;
  locked?: boolean;
  trial?: boolean;
  requiredPlan?: "Pro" | "Premium" | null;
}

export default function PersonaCard({
  persona,
  href,
  compact = false,
  locked = false,
  trial = false,
  requiredPlan,
}: PersonaCardProps) {
  const cardClass = classNames(
    "PersonaCard flex h-full flex-col rounded-xl  p-4 transition-all duration-300",
    "bg-lavenderHaze-100/70 shadow-sm hover:-translate-y-1 hover:shadow-md dark:bg-nightIndigo-900/70",
    locked && "border border-dashed",
    compact ? "gap-2" : "gap-3",
  );

  const titleClass = classNames(
    "heading-5 flex items-center gap-2 leading-tight",
    compact ? "text-lg" : "text-xl",
  );

  const bodyClass = classNames(
    "body-2 text-left",
    compact ? "text-sm" : "text-[0.95rem]",
  );

  const cardBody = (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className={titleClass}>
          <i
            className={classNames(persona.icon, "text-base")}
            aria-hidden="true"
          ></i>
          <span>{persona.label}</span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-dotted px-2 py-1 text-xs">
            {persona.category}
          </span>
          {locked && requiredPlan && (
            <span className="rounded-full border border-amber-400/60 bg-amber-100 px-2 py-1 text-xxs font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
              {requiredPlan}
            </span>
          )}
          {locked && !requiredPlan && (
            <span className="rounded-full border border-amber-400/60 bg-amber-100 px-2 py-1 text-xxs font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
              Locked
            </span>
          )}
          {!locked && trial && (
            <span className="rounded-full border border-sky-400/60 bg-sky-100 px-2 py-1 text-xxs font-semibold uppercase tracking-wide text-sky-900 dark:bg-sky-500/20 dark:text-sky-200">
              Trial
            </span>
          )}
        </div>
      </div>

      <p className="text-sm font-medium text-midnightBlue-600 dark:text-lavenderHaze-600">
        {persona.tagline}
      </p>
      <div className="relative mt-1 h-36 w-full overflow-hidden rounded-lg border border-slate-400/60 dark:border-slate-500">
        <Image
          src={persona.heroImage}
          alt={`${persona.label} persona`}
          fill
          unoptimized
          sizes="(max-width: 1024px) 100vw, 33vw"
          className="object-cover"
        />
      </div>
      <p className={bodyClass}>{persona.description}</p>
      {locked && (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
          {requiredPlan
            ? `Upgrade to ${requiredPlan} to unlock this persona.`
            : "Upgrade your plan to unlock this persona."}
        </p>
      )}
      {!locked && trial && (
        <p className="text-xs font-medium text-sky-700 dark:text-sky-300">
          Trial access with reduced limits. Upgrade to unlock full access.
        </p>
      )}

      {!compact && (
        <ul className="mt-auto flex flex-wrap gap-2 pt-2">
          <li className="rounded-full bg-lavenderHaze-200 px-2 py-1 text-xxs dark:bg-nightIndigo-500/40">
            {persona.supportsImage ? "Image-enabled" : "Text-first"}
          </li>
          <li className="rounded-full bg-lavenderHaze-200 px-2 py-1 text-xxs dark:bg-nightIndigo-500/40">
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
