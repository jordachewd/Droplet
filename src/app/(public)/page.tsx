import CtaBanner from "@/components/sections/homepage/cta-banner";
import FeaturesSection from "@/components/sections/homepage/features-section";
import HeroSection from "@/components/sections/homepage/hero-section";
import PersonaSpotlight from "@/components/sections/homepage/persona-spotlight";
import WorkflowSection from "@/components/sections/homepage/workflow-section";
import { getEffectiveLandingPageContent } from "@/lib/utils/effective-website-copy";
import Link from "next/link";

export default async function HomePage() {
  const {
    heroContent,
    landingContent,
    homepageCopy,
    homepageFeaturedPersonaIds,
  } = await getEffectiveLandingPageContent();

  return (
    <div className="HomePageWrapper relative z-10 -mt-16 mb-10 mx-auto flex w-full flex-1 flex-col items-center gap-20">
      <HeroSection content={heroContent} />
      <FeaturesSection featureCards={landingContent.featureCards} />

      <div className="flex flex-col w-full gap-8">
        <h5 className="heading-5 flex mx-auto w-full max-w-screen-2xl">
          Buttons
        </h5>

        <div className="flex mx-auto w-full max-w-screen-2xl items-center gap-6">
          <Link className="btn btn-xs btn-text" href="/">
            Text Xs
          </Link>
          <Link className="btn btn-sm btn-text" href="/">
            Text sm
          </Link>

          <Link className="btn btn-text" href="/">
            Text Default
          </Link>

          <Link className="btn btn-md btn-text" href="/">
            Text md
          </Link>
          <Link className="btn btn-lg btn-text" href="/">
            Text lg
          </Link>
        </div>

        <div className="flex mx-auto w-full max-w-screen-2xl items-center gap-6">
          <Link className="btn btn-xs btn-outlined" href="/">
            outlined Xs
          </Link>
          <Link className="btn btn-sm btn-outlined" href="/">
            outlined sm
          </Link>

          <Link className="btn btn-outlined" href="/">
            outlined Default
          </Link>

          <Link className="btn btn-md btn-outlined" href="/">
            outlined md
          </Link>
          <Link className="btn btn-lg btn-outlined" href="/">
            outlined lg
          </Link>
        </div>

        <div className="flex mx-auto w-full max-w-screen-2xl items-center gap-6">
          <Link className="btn btn-xs btn-contained" href="/">
            contained Xs
          </Link>
          <Link className="btn btn-sm btn-contained" href="/">
            contained sm
          </Link>

          <Link className="btn btn-contained" href="/">
            contained Default
          </Link>

          <Link className="btn btn-md btn-contained" href="/">
            contained md
          </Link>
          <Link className="btn btn-lg btn-contained" href="/">
            contained lg
          </Link>
        </div>

        <div className="flex mx-auto w-full max-w-screen-2xl items-center gap-6">
          <Link className="btn btn-xs btn-danger" href="/">
            danger Xs
          </Link>
          <Link className="btn btn-sm btn-danger" href="/">
            danger sm
          </Link>

          <Link className="btn btn-danger" href="/">
            danger Default
          </Link>

          <Link className="btn btn-md btn-danger" href="/">
            danger md
          </Link>
          <Link className="btn btn-lg btn-danger" href="/">
            danger lg
          </Link>
        </div>

        <div className="flex mx-auto w-full max-w-screen-2xl items-center gap-6">
          <Link className="btn btn-xs btn-hero" href="/">
            Hero Xs
          </Link>
          <Link className="btn btn-sm btn-hero" href="/">
            Hero sm
          </Link>

          <Link className="btn btn-hero" href="/">
            Hero Default
          </Link>

          <Link className="btn btn-md btn-hero" href="/">
            Hero md
          </Link>
          <Link className="btn btn-lg btn-hero" href="/">
            Hero lg
          </Link>
        </div>

        <div className="flex mx-auto w-full max-w-screen-2xl">
          <Link className="icon-btn" href="/">
            <i className="bi bi-basket3"></i>
          </Link>
        </div>
      </div>

      <WorkflowSection
        howItWorksSteps={landingContent.howItWorksSteps}
        workflowCopy={landingContent.workflow}
      />
      <PersonaSpotlight
        copy={{
          spotlightLabel: homepageCopy.spotlightLabel,
          spotlightHeading: homepageCopy.spotlightHeading,
          spotlightDescription: homepageCopy.spotlightDescription,
        }}
        featuredPersonaIds={homepageFeaturedPersonaIds}
      />
      <CtaBanner
        copy={{
          ctaHeading: homepageCopy.ctaHeading,
          ctaDescription: homepageCopy.ctaDescription,
          ctaPrimaryLabel: homepageCopy.ctaPrimaryLabel,
          ctaSecondaryLabel: homepageCopy.ctaSecondaryLabel,
        }}
      />
    </div>
  );
}
