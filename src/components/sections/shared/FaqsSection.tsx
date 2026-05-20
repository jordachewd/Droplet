import PageHead from "@/components/layout/PageHead";
import PublicSection from "@/components/public/PublicSection";
import type { FaqItem } from "@/constants/faqs";
import classNames from "classnames";

interface FaqsProps {
  faqsData: FaqItem[];
}

export default function FaqsSection({ faqsData }: FaqsProps) {
  const faqSummaryIconClass = classNames(
    "faqs-card--summary-icon bi bi-arrow-down-short group-open:rotate-180",
  );

  const faqPanelClass = classNames(
    "faqs-card--panel group-open:grid-rows-[1fr] group-open:opacity-100",
  );

  return (
    <PublicSection
      id="faqs-section"
      sectionClass="faqs-section"
      wrapperClass="faqs-wrapper"
    >
      <PageHead
        id="faqs-section-head"
        title="Frequently Asked Questions"
        subtitle="Find answers to the most frequently asked questions below."
        align="center"
        headingLevel="h2"
        type="section"
      />

      <div id="faqs-section-content" className="faqs-content">
        {faqsData.map((faq) => (
          <details key={faq.id} className="faqs-card group">
            <summary
              aria-controls={`panel${faq.id}-content`}
              id={`panel${faq.id}-header`}
              className="faqs-card--summary"
            >
              <h6 className="heading-6 text-left leading-snug">
                {faq.question}
              </h6>

              <i className={faqSummaryIconClass} aria-hidden="true"></i>
            </summary>

            <div id={`panel${faq.id}-content`} className={faqPanelClass}>
              <p className="body-2 overflow-hidden pt-2 md:text-base">
                {faq.answer}
              </p>
            </div>
          </details>
        ))}
      </div>
    </PublicSection>
  );
}
