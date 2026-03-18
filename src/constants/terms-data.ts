import { PlanPricing } from "@/constants/plans";
import termsData from "@/json/terms.json";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export const legalReviewDisclaimer =
  "This policy is provided for informational purposes. Legal review recommended before production publication.";

function interpolateTermsParagraph(
  paragraph: string,
  pricing: PlanPricing,
  currencySymbol: string,
): string {
  return paragraph
    .replaceAll("{{CURRENCY}}", currencySymbol)
    .replaceAll("{{PRO_PRICE}}", String(pricing.Pro))
    .replaceAll("{{PREMIUM_PRICE}}", String(pricing.Premium));
}

export function buildTermsSections({
  pricing,
  currencySymbol = pricing.currencySymbol,
}: {
  pricing: PlanPricing;
  currencySymbol?: string;
}): LegalSection[] {
  return (termsData.termsSections as LegalSection[]).map((section) => ({
    title: section.title,
    paragraphs: section.paragraphs.map((paragraph) =>
      interpolateTermsParagraph(paragraph, pricing, currencySymbol),
    ),
  }));
}
