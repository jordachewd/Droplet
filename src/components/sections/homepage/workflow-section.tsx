import { howItWorksSteps } from "@/constants/landing-data";
import classNames from "classnames";

export default function WorkflowSection() {
  return (
    <section className="Workflow mx-auto grid w-full max-w-screen-2xl gap-6 px-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div
        className={classNames(
          "rounded-2xl px-6 py-8 shadow-sm bg-lavenderHaze-100/78 dark:bg-nightIndigo-900/82",
        )}
      >
        <p className="text-xxs font-semibold uppercase tracking-[0.3em] text-midnightBlue-700 dark:text-lavenderHaze-700">
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
                "rounded-2xl px-4 py-4 bg-lavenderHaze-200/80 dark:bg-nightIndigo-1000/70",
              )}
            >
              <div className="flex items-start gap-4">
                <span className="heading-5 min-w-12 text-midnightBlue-600 dark:text-lavenderHaze-600">
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
          "rounded-2xl px-6 py-8 shadow-sm bg-linear-135 from-lavenderHaze-100 via-white to-lavenderHaze-100",
          "dark:bg-linear-135 dark:from-nightIndigo-1000 dark:via-nightIndigo-1000 dark:to-nightIndigo-900/60",
        )}
      >
        <p className="text-xxs font-semibold uppercase tracking-[0.3em] text-midnightBlue-700 dark:text-lavenderHaze-700">
          Conversation rhythm
        </p>
        <div className="mt-5 flex flex-col gap-4">
          <article className="rounded-2xl bg-lavenderHaze-100/90 p-4 shadow-sm dark:bg-nightIndigo-1000/80">
            <p className="text-xxs font-semibold uppercase tracking-[0.24em] text-midnightBlue-700 dark:text-lavenderHaze-700">
              You
            </p>
            <p className="body-2 mt-2 text-sm">
              Build me a launch plan for a small SaaS with a free tier and two
              paid plans.
            </p>
          </article>
          <article className="rounded-2xl bg-lavenderHaze-100/80 p-4 shadow-sm dark:bg-nightIndigo-900/72">
            <p className="text-xxs font-semibold uppercase tracking-[0.24em] text-midnightBlue-700 dark:text-lavenderHaze-700">
              Strategist
            </p>
            <p className="body-2 mt-2 text-sm">
              Here is the sequence: pricing truth first, navigation second, then
              plan-aware messaging so the site and product say the same thing.
            </p>
          </article>
          <article className="rounded-2xl bg-twilightPurple-100/85 p-4 shadow-sm dark:bg-dustyBlue-1000/78">
            <p className="text-xxs font-semibold uppercase tracking-[0.24em] text-midnightBlue-700 dark:text-lavenderHaze-700">
              Result
            </p>
            <p className="body-2 mt-2 text-sm">
              You leave with concrete next actions instead of another vague wall
              of AI text.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
