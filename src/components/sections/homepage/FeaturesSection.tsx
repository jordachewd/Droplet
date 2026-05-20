import ContentCard from "@/components/layout/ContentCard";
import PublicSection from "@/components/public/PublicSection";
import {
  getDefaultLandingContent,
  LandingFeatureCard,
} from "@/constants/landing-data";

interface FeaturesSectionProps {
  id: string;
  featureCards?: LandingFeatureCard[];
}

export default function FeaturesSection({
  id,
  featureCards = getDefaultLandingContent().featureCards,
}: FeaturesSectionProps) {
  return (
    <PublicSection
      id={id}
      sectionClass="features-section"
      wrapperClass="features-wrapper"
    >
      {featureCards.map((card, index) => (
        <ContentCard
          key={card.title + index}
          icon={card.icon}
          title={card.title}
          description={card.description}
        />
      ))}
    </PublicSection>
  );
}
