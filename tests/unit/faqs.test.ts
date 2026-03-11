import { describe, expect, it } from "vitest";
import { faqs } from "@/constants/faqs";

describe("faqs", () => {
  it("uses the approved support email and free plan copy", () => {
    const supportFaq = faqs.find((faq) => faq.id === 1);
    const freePlanFaq = faqs.find((faq) => faq.id === 6);

    expect(supportFaq?.answer).toContain("office@jordachewd.com");
    expect(freePlanFaq).toEqual(
      expect.objectContaining({
        question: "Does Droplet have a free plan?",
        answer:
          "Yes, every new account starts with our Lite plan which is free forever. " +
          "You can upgrade to Pro or Premium anytime for additional features and higher limits.",
      }),
    );
  });

  it("removes obsolete trial and yearly billing language from every FAQ entry", () => {
    const allFaqCopy = faqs
      .flatMap((faq) => [faq.question, faq.answer])
      .join(" ")
      .toLowerCase();

    expect(allFaqCopy).not.toContain("trial");
    expect(allFaqCopy).not.toContain("yearly");
  });
});
