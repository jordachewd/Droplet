import Image from "next/image";
import {
  DEFAULT_PROMO_CONTENT,
  PromoContent,
  resolvePersonaUpgradeMessage,
} from "@/constants/promo-content";
import { Persona } from "@/types/PersonaData.d";
import ContentCard from "../layout/ContentCard";

interface PersonaCardProps {
  persona: Persona;
  href?: string;
  compact?: boolean;
  locked?: boolean;
  trial?: boolean;
  requiredPlan?: "Pro" | "Premium" | null;
  promoContent?: PromoContent;
}

export default function PersonaCard({
  persona,
  href,
  compact = false,
  locked = false,
  trial = false,
  requiredPlan,
  promoContent = DEFAULT_PROMO_CONTENT,
}: PersonaCardProps) {
  return (
    <ContentCard
      eyebrow={persona.category}
      title={persona.label}
      tagline={persona.tagline}
      icon={persona.icon}
      description={persona.description}
      href={href}
    >
      <div className="flex flex-col items-center gap-2 mt-auto">
        <div className="relative h-36 w-full overflow-hidden rounded-lg mt-6">
          <Image
            src={persona.heroImage}
            alt={`${persona.label} persona`}
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="object-cover"
          />
        </div>

        {locked && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            {resolvePersonaUpgradeMessage({
              template: promoContent.promoPersonaUpgrade,
              fallback: promoContent.promoPersonaUpgradeFallback,
              requiredPlan,
            })}
          </p>
        )}

        {!locked && trial && (
          <p className="text-xs font-medium text-sky-700 dark:text-sky-300">
            {promoContent.promoTrialLabel}
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
      </div>
    </ContentCard>
  );
}
