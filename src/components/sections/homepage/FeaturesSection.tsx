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
      {featureCards.map((card) => (
        <article key={card.title} className="content-card">
          <div className="featured-icon">
            <i className={card.icon} aria-hidden="true"></i>
          </div>
          <h2 className="heading-5 mt-5">{card.title}</h2>
          <p className="body-2 mt-3 text-sm md:text-base">{card.description}</p>
        </article>
      ))}
    </PublicSection>
  );
}
