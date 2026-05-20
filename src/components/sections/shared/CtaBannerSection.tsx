import Link from "next/link";
import { HomepageCopy } from "@/constants/homepage-copy";
import PublicSection from "@/components/public/PublicSection";

interface CtaBannerProps {
  id: string;
  copy: Pick<
    HomepageCopy,
    | "ctaHeading"
    | "ctaDescription"
    | "ctaPrimaryLabel"
    | "ctaPrimaryLink"
    | "ctaSecondaryLabel"
    | "ctaSecondaryLink"
  >;
}

export default function CtaBannerSection({ id, copy }: CtaBannerProps) {
  return (
    <PublicSection
      id={id}
      sectionClass="banner-section"
      wrapperClass="banner-wrapper"
    >
      <div className="banner-container">
        <div className="banner-content">
          <div className="banner-content-box lg:max-w-1/2">
            <h3 className="heading-3 leading-tight">{copy.ctaHeading}</h3>
            <p className="body-2 text-sm md:text-base">{copy.ctaDescription}</p>
          </div>

          <div className="banner-content-box md:flex-row">
            <Link
              className="btn btn-lg btn-contained"
              href={copy.ctaPrimaryLink || "/"}
            >
              {copy.ctaPrimaryLabel}
            </Link>
            <Link
              className="btn btn-lg btn-outlined"
              href={copy.ctaSecondaryLink || "/"}
            >
              {copy.ctaSecondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </PublicSection>
  );
}
