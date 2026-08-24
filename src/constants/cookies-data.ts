export interface CookieCategory {
  title: string;
  description: string;
}

import { legalReviewDisclaimer } from "@/constants/legal-shared";
import cookiesData from "@/json/cookies.json";

export { legalReviewDisclaimer };
export const cookieCategories =
  cookiesData.cookieCategories as CookieCategory[];
