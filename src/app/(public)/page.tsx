import CtaBanner from "@/components/sections/homepage/cta-banner";
import FeaturesSection from "@/components/sections/homepage/features-section";
import HeroSection from "@/components/sections/homepage/hero-section";
import PersonaSpotlight from "@/components/sections/homepage/persona-spotlight";
import WorkflowSection from "@/components/sections/homepage/workflow-section";
import { getEffectiveLandingPageContent } from "@/lib/utils/effective-website-copy";

export default async function HomePage() {
  const { heroContent, landingContent } =
    await getEffectiveLandingPageContent();

  return (
    <div className="HomePageWrapper relative z-10 -mt-16 mb-10 mx-auto flex w-full flex-1 flex-col items-center gap-20">
      <HeroSection content={heroContent} />
      <FeaturesSection featureCards={landingContent.featureCards} />
      <WorkflowSection
        howItWorksSteps={landingContent.howItWorksSteps}
        workflowCopy={landingContent.workflow}
      />
      <PersonaSpotlight />
      <CtaBanner />
    </div>
  );
}
