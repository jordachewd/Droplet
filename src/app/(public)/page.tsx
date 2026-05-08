import CtaBanner from "@/components/sections/homepage/BannerSection";
import FeaturesSection from "@/components/sections/homepage/FeaturesSection";
import HeroSection from "@/components/sections/homepage/HeroSection";
import PersonaSection from "@/components/sections/homepage/PersonaSection";
import WorkflowSection from "@/components/sections/homepage/WorkflowSection";
import { getEffectiveLandingPageContent } from "@/lib/utils/effective-website-copy";

export default async function HomePage() {
  const {
    heroContent,
    landingContent,
    homepageCopy,
    homepageFeaturedPersonaIds,
  } = await getEffectiveLandingPageContent();

  return (
    <>
      <HeroSection id="homepage-hero" content={heroContent} />
      <FeaturesSection
        id="homepage-features"
        featureCards={landingContent.featureCards}
      />

      <WorkflowSection
        id="homepage-workflow"
        howItWorksSteps={landingContent.howItWorksSteps}
        workflowCopy={landingContent.workflow}
      />

      <PersonaSection
        id="homepage-personas"
        copy={{
          spotlightLabel: homepageCopy.spotlightLabel,
          spotlightHeading: homepageCopy.spotlightHeading,
          spotlightDescription: homepageCopy.spotlightDescription,
        }}
        featuredPersonaIds={homepageFeaturedPersonaIds}
      />

      <CtaBanner
        id="homepage-banner"
        copy={{
          ctaHeading: homepageCopy.ctaHeading,
          ctaDescription: homepageCopy.ctaDescription,
          ctaPrimaryLabel: homepageCopy.ctaPrimaryLabel,
          ctaSecondaryLabel: homepageCopy.ctaSecondaryLabel,
        }}
      />
    </>
  );
}
