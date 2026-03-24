import PageHead from "@/components/layout/page-head";
import type { FaqItem } from "@/constants/faqs";
import classNames from "classnames";

interface FaqsProps {
  faqsData: FaqItem[];
}

export default function Faqs({ faqsData }: FaqsProps) {
  const faqCardClass = classNames(
    "group rounded-lg bg-lavenderHaze-400 px-4 py-3 shadow-sm transition-all",
    "dark:bg-nightIndigo-900 open:bg-lavenderHaze-100 dark:open:bg-nightIndigo-900/50",
  );

  const faqContentClass = classNames(
    "grid grid-rows-[0fr] opacity-0",
    "transition-[grid-template-rows,opacity] duration-300 ease-in-out",
    "group-open:grid-rows-[1fr] group-open:opacity-100",
  );
  const wrapperClassName = classNames(
    "Faqs mx-auto flex w-full flex-col gap-16 p-4 max-w-screen-2xl",
  );

  return (
    <section className={wrapperClassName}>
      <PageHead
        title="Frequently Asked Questions"
        subtitle="Find answers to the most frequently asked questions below."
        align="center"
      />

      <div className="flex flex-col gap-2.5">
        {faqsData.map((faq) => (
          <details key={faq.id} className={faqCardClass}>
            <summary
              aria-controls={`panel${faq.id}-content`}
              id={`panel${faq.id}-header`}
              className="flex cursor-pointer list-none items-center justify-between gap-4 py-1"
            >
              <h3 className="heading-6 text-left leading-snug">
                {faq.question}
              </h3>
              <i
                className="bi bi-arrow-down-short text-xl transition-transform group-open:rotate-180"
                aria-hidden="true"
              ></i>
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
