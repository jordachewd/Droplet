import Plans from "./plans-section";
import Faqs from "./faqs-section";
import classNames from "classnames";
import Image from "next/image";
import Link from "next/link";
import { PERSONAS } from "@/constants/assistant-personas";

const featureCards = [
  {
    icon: "bi bi-person-badge",
    title: "Persona-driven chat",
    description:
      "Start each conversation with a specialist persona instead of forcing one generic assistant to do every job.",
  },
  {
    icon: "bi bi-image",
    title: "Media-capable workflows",
    description:
      "Move from text into image and audio tasks when the persona and plan support the next step.",
  },
  {
    icon: "bi bi-lightning-charge",
    title: "Real-time response flow",
    description:
      "Built for fast back-and-forth conversations so planning, writing, and iteration feel immediate.",
  },
];

const howItWorksSteps = [
  {
    step: "01",
    title: "Pick the right persona",
    description:
      "Choose the Strategist for planning, the Teacher for explanation, the Creator for ideas, or any other approved persona.",
  },
  {
    step: "02",
    title: "Give Droplet the job to do",
    description:
      "Send a prompt, add context, and keep the thread focused on one goal instead of starting from scratch every time.",
  },
  {
    step: "03",
    title: "Turn the answer into output",
    description:
      "Use the result as a draft, a plan, a teaching aid, or the next step in a media workflow.",
  },
];

const featuredPersonas = PERSONAS.filter((persona) =>
  ["strategist", "teacher", "creator"].includes(persona.id),
);

export default function LandingPage() {
  const heroSectionClass = classNames(
    "flex w-full items-center justify-between px-4 pt-14 shadow-sm",
    "bg-white/50 sm:px-6 lg:px-8 dark:bg-darkPrimary-900/50",
  );

  const heroImageWrapperClass = classNames(
    "relative flex w-full justify-center self-end overflow-hidden",
    "sm:min-h-[420px] lg:w-1/2 lg:min-h-[500px] xl:min-h-[600px] xxl:min-h-[700px]",
  );

  const heroGlowClass = classNames(
    "absolute -bottom-28 left-1/2 z-0 h-[90%] w-[60%] -translate-x-1/2 rounded-full blur-3xl",
    "bg-lightSecondary-400/30 dark:bg-darkSecondary-400/20",
  );

  return (
    <section
      className="LandingPage relative z-10 -mt-16 mb-10 flex w-full flex-1 flex-col items-center gap-10"
      id="LandingPageWrapper"
    >
      <div className={heroSectionClass}>
        <div className="mx-auto mt-12 flex max-w-screen-2xl flex-col items-center justify-between lg:mt-0 lg:flex-row lg:gap-5">
          <div className="flex w-full flex-col items-center gap-12 text-center lg:w-1/2 lg:items-start lg:text-left">
            <h1 className="heading-2 leading-tight">
              A smarter way to chat, create, and get things done.
            </h1>

            <p className="heading-6 max-w-2xl">
              Unlock all personas across text conversations, image, and audio
              generation.
              <br />
              Upgrade when you want higher limits and Premium video generation.
            </p>

            <Link
              className="btn btn-lg btn-outlined w-full max-w-[300px] p-4 uppercase"
              href="/app/new"
            >
              Try it for free
            </Link>
          </div>

          <div className={heroImageWrapperClass}>
            <Image
              src="/images/droplet-hero-860x860.png"
              alt="hero"
              width={700}
              height={700}
              priority
              className="z-10"
            />

            <div className={heroGlowClass}>&nbsp;</div>
          </div>
        </div>
      </div>

      <section className="LandingPageFeatures mx-auto grid w-full max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-0">
        {featureCards.map((card) => (
          <article
            key={card.title}
            className={classNames(
              "rounded-[2rem] border px-6 py-8 shadow-sm",
              "border-lightBorders-400/80 bg-white/78",
              "dark:border-darkBorders-500 dark:bg-jwdMarine-900/82",
            )}
          >
            <div className="inline-flex rounded-full bg-lightSecondary-100 px-3 py-2 text-lg dark:bg-darkSecondary-900/50">
              <i className={card.icon}></i>
            </div>
            <h2 className="heading-5 mt-5">{card.title}</h2>
            <p className="body-2 mt-3 text-sm md:text-base">
              {card.description}
            </p>
          </article>
        ))}
      </section>

      <section className="LandingPageWorkflow mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-0">
        <div
          className={classNames(
            "rounded-[2rem] border px-6 py-8 shadow-sm",
            "border-lightBorders-400/80 bg-white/78",
            "dark:border-darkBorders-500 dark:bg-jwdMarine-900/82",
          )}
        >
          <p className="text-xxs font-semibold uppercase tracking-[0.3em] opacity-65">
            How it works
          </p>
          <h2 className="heading-4 mt-3 leading-tight">
            Not another empty prompt box.
          </h2>
          <p className="body-2 mt-4 max-w-2xl text-sm md:text-base">
            Droplet gives the conversation structure from the first click. You
            choose the persona, set the task, and keep the thread alive as the
            work gets more specific.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            {howItWorksSteps.map((step) => (
              <article
                key={step.step}
                className={classNames(
                  "rounded-2xl border px-4 py-4",
                  "border-lightBorders-300 bg-lightBackground-200/80",
                  "dark:border-darkBorders-500 dark:bg-jwdMarine-1000/70",
                )}
              >
                <div className="flex items-start gap-4">
                  <span className="heading-5 min-w-12 opacity-60">
                    {step.step}
                  </span>
                  <div>
                    <h3 className="heading-6">{step.title}</h3>
                    <p className="body-2 mt-2 text-sm">{step.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div
          className={classNames(
            "rounded-[2rem] border px-6 py-8 shadow-sm",
            "border-lightBorders-400/80 bg-linear-135 from-lightPrimary-100 via-white to-lightSecondary-100",
            "dark:border-darkBorders-500 dark:bg-linear-135 dark:from-darkPrimary-1000 dark:via-jwdMarine-1000 dark:to-darkSecondary-900/60",
          )}
        >
          <p className="text-xxs font-semibold uppercase tracking-[0.3em] opacity-65">
            Conversation rhythm
          </p>
          <div className="mt-5 flex flex-col gap-4">
            <article className="rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-jwdMarine-1000/80">
              <p className="text-xxs font-semibold uppercase tracking-[0.24em] opacity-60">
                You
              </p>
              <p className="body-2 mt-2 text-sm">
                Build me a launch plan for a small SaaS with a free tier and two
                paid plans.
              </p>
            </article>
            <article className="rounded-2xl bg-lightPrimary-100/80 p-4 shadow-sm dark:bg-darkPrimary-900/72">
              <p className="text-xxs font-semibold uppercase tracking-[0.24em] opacity-60">
                Strategist
              </p>
              <p className="body-2 mt-2 text-sm">
                Here is the sequence: pricing truth first, navigation second,
                then plan-aware messaging so the site and product say the same
                thing.
              </p>
            </article>
            <article className="rounded-2xl bg-lightAccent-100/85 p-4 shadow-sm dark:bg-darkAccent-1000/78">
              <p className="text-xxs font-semibold uppercase tracking-[0.24em] opacity-60">
                Result
              </p>
              <p className="body-2 mt-2 text-sm">
                You leave with concrete next actions instead of another vague
                wall of AI text.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="LandingPagePersonas mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:px-0">
        <div className="flex flex-col gap-3 text-center">
          <p className="text-xxs font-semibold uppercase tracking-[0.3em] opacity-65">
            Persona spotlight
          </p>
          <h2 className="heading-4 leading-tight">
            Different jobs need different voices.
          </h2>
          <p className="body-2 mx-auto max-w-3xl text-sm md:text-base">
            Droplet starts with purpose-built personas so planning, teaching,
            and creative work do not feel like the same assistant wearing a
            different label.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {featuredPersonas.map((persona) => (
            <article
              key={persona.id}
              className={classNames(
                "rounded-[2rem] border px-6 py-7 shadow-sm",
                "border-lightBorders-400/80 bg-white/78",
                "dark:border-darkBorders-500 dark:bg-jwdMarine-900/82",
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xxs font-semibold uppercase tracking-[0.24em] opacity-60">
                    {persona.category}
                  </p>
                  <h3 className="heading-5 mt-2">{persona.label}</h3>
                </div>
                <span className="rounded-full bg-lightSecondary-100 px-3 py-2 text-lg dark:bg-darkSecondary-900/50">
                  <i className={persona.icon}></i>
                </span>
              </div>
              <p className="body-2 mt-4 text-sm md:text-base">
                {persona.description}
              </p>
              <p className="body-2 mt-4 rounded-2xl bg-lightBackground-200/80 px-4 py-3 text-sm dark:bg-jwdMarine-1000/70">
                &ldquo;{persona.starterPrompts[0]}&rdquo;
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="LandingPageCta mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-0">
        <div
          className={classNames(
            "rounded-[2rem] border px-6 py-8 shadow-sm",
            "border-lightBorders-400/80 bg-linear-135 from-lightSecondary-100 via-white to-lightAccent-100",
            "dark:border-darkBorders-500 dark:bg-linear-135 dark:from-darkPrimary-1000 dark:via-jwdMarine-1000 dark:to-darkSecondary-900/55",
          )}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xxs font-semibold uppercase tracking-[0.3em] opacity-65">
                Start with clarity
              </p>
              <h2 className="heading-4 mt-3 leading-tight">
                Create an account, pick a persona, and let the conversation stay
                focused.
              </h2>
              <p className="body-2 mt-4 text-sm md:text-base">
                Explore the persona catalog first, or compare the plan limits if
                you already know how much capacity you need.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="btn btn-lg btn-contained uppercase"
                href="/sign-up"
              >
                Create account
              </Link>
              <Link className="btn btn-lg btn-outlined uppercase" href="/plans">
                Explore plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Plans />
      <Faqs />
    </section>
  );
}
