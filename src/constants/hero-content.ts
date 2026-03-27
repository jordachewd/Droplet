export interface HeroContent {
  heading: string;
  subheading: string;
  ctaLabel: string;
  imageAlt: string;
}

const HERO_CONTENT_DEFAULTS: HeroContent = {
  heading: "Chat, create,\nand get things done.",
  subheading:
    "Unlock all personas across text conversations,\nimage, and audio generation.",
  ctaLabel: "Try it for free",
  imageAlt:
    "Droplet assistant visual with floating chat and media creation elements",
};

export function getDefaultHeroContent(): HeroContent {
  return {
    ...HERO_CONTENT_DEFAULTS,
  };
}
