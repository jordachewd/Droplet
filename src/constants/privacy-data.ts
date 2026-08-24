import { LegalSection, legalReviewDisclaimer } from "@/constants/legal-shared";
import privacyData from "@/json/privacy.json";

export { legalReviewDisclaimer };
export const privacySections = privacyData.privacySections as LegalSection[];
