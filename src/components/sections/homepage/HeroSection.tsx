import Image from "next/image";
import Link from "next/link";
import { getDefaultHeroContent, HeroContent } from "@/constants/hero-content";
import PublicSection from "@/components/public/PublicSection";

interface HeroProps {
  id: string;
  content?: HeroContent;
}

const defaults = getDefaultHeroContent();
export default function HeroSection({ id, content = defaults }: HeroProps) {
  return (
    <PublicSection
      id={id}
      sectionClass="hero-section"
      wrapperClass="hero-wrapper"
    >
      <div className="hero-content">
        <h1 className="heading-1 whitespace-pre-line">{content.heading}</h1>
        <p className="heading-5 max-w-2xl whitespace-pre-line">
          {content.subheading}
        </p>
        <Link className="btn btn-lg btn-contained px-16" href="/sign-up">
          {content.ctaLabel}
        </Link>
      </div>

      <div className="hero-image">
        <Image
          src="/images/lp-hero-image-flipped.png"
          alt={content.imageAlt}
          width={700}
          height={700}
          priority
          className="z-10"
        />
      </div>
    </PublicSection>
  );
}
