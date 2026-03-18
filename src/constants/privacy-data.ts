export interface LegalSection {
  title: string;
  paragraphs: string[];
}

import privacyData from "@/json/privacy.json";

export const legalReviewDisclaimer =
  "This policy is provided for informational purposes. Legal review recommended before production publication.";

export const privacySections = privacyData.privacySections as LegalSection[];
