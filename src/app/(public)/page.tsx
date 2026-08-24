import CtaBannerSection from "@/components/sections/shared/CtaBannerSection";
import FeaturesSection from "@/components/sections/homepage/FeaturesSection";
import HeroSection from "@/components/sections/homepage/HeroSection";
import PersonaSpotlight from "@/components/sections/homepage/PersonaSpotlight";
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

      <PersonaSpotlight
        id="homepage-personas"
        copy={{
          spotlightLabel: homepageCopy.spotlightLabel,
          spotlightHeading: homepageCopy.spotlightHeading,
          spotlightDescription: homepageCopy.spotlightDescription,
        }}
        featuredPersonaIds={homepageFeaturedPersonaIds}
      />

      <CtaBannerSection
        id="home-cta-banner"
        copy={{
          ctaHeading: homepageCopy.ctaHeading,
          ctaDescription: homepageCopy.ctaDescription,
          ctaPrimaryLabel: homepageCopy.ctaPrimaryLabel,
          ctaPrimaryLink: homepageCopy.ctaPrimaryLink,
          ctaSecondaryLabel: homepageCopy.ctaSecondaryLabel,
          ctaSecondaryLink: homepageCopy.ctaSecondaryLink,
        }}
      />
    </>
  );
}
