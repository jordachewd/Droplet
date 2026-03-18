import { FaqItem, faqs } from "@/constants/faqs";
import classNames from "classnames";

interface FaqsProps {
  faqsData?: FaqItem[];
}

export default function Faqs({ faqsData }: FaqsProps) {
  const faqItems = faqsData ?? faqs;
  const faqCardClass = classNames(
    "group rounded-lg border border-slate-500 bg-lavenderHaze-100 px-4 py-3 shadow-sm transition-all",
    "open:border-twilightPurple-700 open:bg-lavenderHaze-100/60",
    "dark:border-slate-500 dark:bg-nightIndigo-900",
    "dark:open:border-dustyBlue-500 dark:open:bg-nightIndigo-900/50",
  );

  const faqContentClass = classNames(
    "grid grid-rows-[0fr] opacity-0",
    "transition-[grid-template-rows,opacity] duration-300 ease-in-out",
    "group-open:grid-rows-[1fr] group-open:opacity-100",
  );
  const wrapperClassName = classNames(
    "Faqs mx-auto flex w-full flex-col gap-8 p-4 sm:gap-10 max-w-screen-2xl",
  );

  return (
    <section className={wrapperClassName}>
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <h2 className="heading-4 leading-tight">Frequently Asked Questions</h2>
        <p className="body-2 max-w-2xl">
          Find answers to the most frequently asked questions below.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {faqItems.map((faq) => (
          <details key={faq.id} className={faqCardClass}>
            <summary
              aria-controls={`panel${faq.id}-content`}
              id={`panel${faq.id}-header`}
              className="flex cursor-pointer list-none items-center justify-between gap-4 py-1"
            >
              <h3 className="heading-6 text-left leading-snug">
                {faq.question}
              </h3>
              <i className="bi bi-arrow-down-short text-xl transition-transform group-open:rotate-180"></i>
            </summary>
            <div id={`panel${faq.id}-content`} className={faqContentClass}>
              <p className="body-2 overflow-hidden pt-2 text-sm md:text-base">
                {faq.answer}
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
