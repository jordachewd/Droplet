import CtaBanner from "@/components/sections/homepage/cta-banner";
import FeaturesSection from "@/components/sections/homepage/features-section";
import HeroSection from "@/components/sections/homepage/hero-section";
import PersonaSpotlight from "@/components/sections/homepage/persona-spotlight";
import WorkflowSection from "@/components/sections/homepage/workflow-section";

export default async function HomePage() {
  return (
    <div className="HomePageWrapper relative z-10 -mt-16 mb-10 mx-auto flex w-full flex-1 flex-col items-center gap-20">
      <HeroSection />
      <FeaturesSection />
      <WorkflowSection />
      <PersonaSpotlight />
      <CtaBanner />
    </div>
  );
}
