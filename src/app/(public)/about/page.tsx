import type { Metadata } from "next";
import classNames from "classnames";
import Link from "next/link";
import PageHead from "@/components/layout/page-head";
import {
  AboutVisualType,
  buildAboutSections,
  buildPersonaAccessSummary,
} from "@/constants/about-data";
import { PlanPricing } from "@/constants/plans";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";
import { getEffectiveAboutContent } from "@/lib/utils/effective-website-copy";


export const metadata: Metadata = {
  title: "About | Droplet",
  description:
    "Learn how Droplet combines persona-led AI guidance, media workflows, and plan-based access for focused conversations.",
};

function renderAboutVisual(
  visualType: AboutVisualType,
  pricing: PlanPricing,
  currencySymbol: string,
  personaCategories: Array<[string, number]>,
  personaCatalog: Array<{ id: string; label: string }>,
) {
  const visualClassName = classNames(
    "rounded-2xl p-6 shadow-sm",
    "bg-lavenderHaze-100/80 dark:bg-nightIndigo-900/85",
  );

  if (visualType === "identity") {
    return (
      <div className={visualClassName}>
        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl bg-lavenderHaze-100 p-4 dark:bg-nightIndigo-900/70">
            <p className="text-xxs font-semibold uppercase tracking-[0.28em] text-midnightBlue-700 dark:text-lavenderHaze-700">
              Personas
            </p>
            <p className="heading-5 mt-3">{personaCatalog.length}</p>
            <p className="body-2 mt-2 text-sm">
              Guided conversation styles with distinct prompts and boundaries.
            </p>
          </article>
          <article className="rounded-2xl bg-lavenderHaze-100 p-4 dark:bg-nightIndigo-900/45">
            <p className="text-xxs font-semibold uppercase tracking-[0.28em] text-midnightBlue-700 dark:text-lavenderHaze-700">
              Plans
            </p>
            <p className="heading-5 mt-3">3</p>
            <p className="body-2 mt-2 text-sm">
              Lite, Pro, and Premium with plan-based persona access.
            </p>
          </article>
          <article className="rounded-2xl bg-twilightPurple-100 p-4 dark:bg-dustyBlue-1000/80">
            <p className="text-xxs font-semibold uppercase tracking-[0.28em] text-midnightBlue-700 dark:text-lavenderHaze-700">
              Modes
            </p>
            <p className="heading-5 mt-3">Text + Media</p>
            <p className="body-2 mt-2 text-sm">
              Conversations stay central while media tools extend the workflow.
            </p>
          </article>
        </div>
      </div>
    );
  }

  if (visualType === "workflow") {
    const steps = [
      {
        step: "01",
        title: "Choose a persona",
        text: "Start with the role that matches the job to be done.",
      },
      {
        step: "02",
        title: "Send the prompt",
        text: "Keep the conversation grounded in one thread and one persona.",
      },
      {
        step: "03",
        title: "Reuse the output",
        text: "Return to the conversation later from your saved library.",
      },
    ];

    return (
      <div className={visualClassName}>
        <div className="flex flex-col gap-4">
          {steps.map((step) => (
            <article
              key={step.step}
              className={classNames(
                "rounded-2xl border px-4 py-4",
                "border-slate-300 bg-lavenderHaze-200/80",
                "dark:border-slate-500 dark:bg-nightIndigo-1000/70",
              )}
            >
              <div className="flex items-start gap-4">
                <span className="heading-5 min-w-12 text-midnightBlue-600 dark:text-lavenderHaze-600">
                  {step.step}
                </span>
                <div>
                  <h3 className="heading-6">{step.title}</h3>
                  <p className="body-2 mt-2 text-sm">{step.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (visualType === "personas") {
    return (
      <div className={visualClassName}>
        <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl bg-lavenderHaze-200/85 p-4 dark:bg-nightIndigo-1000/70">
            <p className="text-xxs font-semibold uppercase tracking-[0.28em] text-midnightBlue-700 dark:text-lavenderHaze-700">
              Categories
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {personaCategories.map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between"
                >
                  <span className="body-2 text-sm">{category}</span>
                  <span className="rounded-2xl bg-lavenderHaze-200 px-3 py-1 text-xs font-semibold dark:bg-nightIndigo-900/50">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-lavenderHaze-100/75 p-4 dark:bg-nightIndigo-900/70">
            <p className="text-xxs font-semibold uppercase tracking-[0.28em] text-midnightBlue-700 dark:text-lavenderHaze-700">
              Current catalog
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {personaCatalog.map((persona) => (
                <span
                  key={persona.id}
                  className={classNames(
                    "rounded-2xl px-3 py-1.5 text-xs font-semibold shadow-sm",
                    "bg-lavenderHaze-100/90 text-midnightBlue-500",
                    "dark:bg-nightIndigo-1000 dark:text-lavenderHaze-500",
                  )}
                >
                  {persona.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (visualType === "media") {
    const mediaCards = [
      {
        label: "Image",
        detail: "Visual generation and upload-aware chat workflows.",
      },
      {
        label: "Audio",
        detail: "Speech-oriented responses and generated audio outputs.",
      },
      {
        label: "Premium",
        detail: "Reserved for the highest-capacity media workflows.",
      },
    ];

    return (
      <div className={visualClassName}>
        <div className="grid gap-4 sm:grid-cols-3">
          {mediaCards.map((card) => (
            <article
              key={card.label}
              className={classNames(
                "rounded-2xl border px-4 py-5",
                "border-slate-300 bg-lavenderHaze-200/85",
                "dark:border-slate-500 dark:bg-nightIndigo-1000/70",
              )}
            >
              <p className="text-xxs font-semibold uppercase tracking-[0.28em] text-midnightBlue-700 dark:text-lavenderHaze-700">
                {card.label}
              </p>
              <p className="body-2 mt-3 text-sm">{card.detail}</p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={visualClassName}>
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl bg-lavenderHaze-200/90 p-4 dark:bg-nightIndigo-1000/70">
          <p className="text-xxs font-semibold uppercase tracking-[0.28em] text-midnightBlue-700 dark:text-lavenderHaze-700">
            Lite
          </p>
          <p className="heading-5 mt-3">Free forever</p>
          <p className="body-2 mt-2 text-sm">
            All personas with capped daily conversations and media usage.
          </p>
        </article>
        <article className="rounded-2xl bg-lavenderHaze-100/85 p-4 dark:bg-nightIndigo-900/45">
          <p className="text-xxs font-semibold uppercase tracking-[0.28em] text-midnightBlue-700 dark:text-lavenderHaze-700">
            Pro
          </p>
          <p className="heading-5 mt-3">{`${currencySymbol}${pricing.Pro}`}</p>
          <p className="body-2 mt-2 text-sm">
            Higher prompt and conversation ceilings for regular work.
          </p>
        </article>
        <article className="rounded-2xl bg-twilightPurple-100/85 p-4 dark:bg-dustyBlue-1000/80">
          <p className="text-xxs font-semibold uppercase tracking-[0.28em] text-midnightBlue-700 dark:text-lavenderHaze-700">
            Premium
          </p>
          <p className="heading-5 mt-3">{`${currencySymbol}${pricing.Premium}`}</p>
          <p className="body-2 mt-2 text-sm">
            Highest-capacity tier for advanced media and premium workflows.
          </p>
        </article>
      </div>
    </div>
  );
}

export default async function AboutPage() {
  const [
    effectivePlanConfig,
    personaAccessByPlan,
    effectivePersonas,
    aboutContent,
  ] = await Promise.all([
    getEffectivePlanConfig(),
    getEffectivePersonaAccessByPlan(),
    getEffectivePersonaConfig(),
    getEffectiveAboutContent(),
  ]);
  const personaLabelById = Object.fromEntries(
    effectivePersonas.map((persona) => [persona.id, persona.label]),
  );
  const personaAccessSummary = buildPersonaAccessSummary(
    personaAccessByPlan,
    personaLabelById,
  );
  const personaCategories = Object.entries(
    effectivePersonas.reduce<Record<string, number>>((accumulator, persona) => {
      accumulator[persona.category] = (accumulator[persona.category] ?? 0) + 1;
      return accumulator;
    }, {}),
  );
  const personaCatalog = effectivePersonas.map((persona) => ({
    id: persona.id,
    label: persona.label,
  }));
  const aboutSections = buildAboutSections({
    personaAccessSummary,
    content: aboutContent,
  });

  return (
    <>
      <PageHead
        title={aboutContent.pageTitle}
        subtitle={aboutContent.pageSubtitle}
        align="center"
      />

      {aboutSections.map((section, index) => (
        <div
          key={section.title}
          className={classNames(
            "grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]",
            index % 2 === 1 && "lg:[&>*:first-child]:order-2",
          )}
        >
          <div
            className={classNames(
              "rounded-2xl px-6 py-7 shadow-sm",
              "bg-lavenderHaze-100/70 dark:bg-midnightBlue-900/80",
            )}
          >
            <p className="text-xxs font-semibold uppercase tracking-[0.3em] text-midnightBlue-700 dark:text-lavenderHaze-700">
              {section.eyebrow}
            </p>
            <h2 className="heading-5 mt-3 leading-tight">{section.title}</h2>
            <div className="mt-4 flex flex-col gap-4">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="body-2 text-sm md:text-base">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {renderAboutVisual(
            section.visualType,
            effectivePlanConfig.pricing,
            effectivePlanConfig.pricing.currencySymbol,
            personaCategories,
            personaCatalog,
          )}
        </div>
      ))}

      <div
        className={classNames(
          "w-full max-w-screen-2xl rounded-2xl  px-6 py-8 shadow-sm",
          "bg-linear-135 from-lavenderHaze-100 via-white to-twilightPurple-100",
          "dark:bg-linear-135 dark:from-nightIndigo-1000 dark:via-nightIndigo-1000 dark:to-nightIndigo-900/55",
        )}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="heading-5 leading-tight">{aboutContent.ctaTitle}</h2>
            <p className="body-2 mt-3 text-sm md:text-base">
              {aboutContent.ctaDescription}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="btn btn-lg btn-contained" href="/plans">
              {aboutContent.ctaPrimaryLabel}
            </Link>
            <Link className="btn btn-lg btn-outlined" href="/personas">
              {aboutContent.ctaSecondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
