export interface LandingFeatureCard {
  icon: string;
  title: string;
  description: string;
}

export interface LandingHowItWorksStep {
  step: string;
  title: string;
  description: string;
}

import landingData from "@/json/landing.json";

export const featureCards = landingData.featureCards as LandingFeatureCard[];

export const howItWorksSteps =
  landingData.howItWorksSteps as LandingHowItWorksStep[];
