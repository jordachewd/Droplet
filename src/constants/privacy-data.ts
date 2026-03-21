export interface LegalSection {
  title: string;
  paragraphs: string[];
}

import { legalReviewDisclaimer } from "@/constants/legal-shared";
import privacyData from "@/json/privacy.json";

export { legalReviewDisclaimer };
export const privacySections = privacyData.privacySections as LegalSection[];
