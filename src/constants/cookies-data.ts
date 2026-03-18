export interface CookieCategory {
  title: string;
  description: string;
}

import cookiesData from "@/json/cookies.json";

export const legalReviewDisclaimer =
  "This policy is provided for informational purposes. Legal review recommended before production publication.";

export const cookieCategories =
  cookiesData.cookieCategories as CookieCategory[];
