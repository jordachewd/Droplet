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

export interface LandingWorkflowRhythmCard {
  label: string;
  detail: string;
}

export interface LandingWorkflowCopy {
  eyebrow: string;
  title: string;
  description: string;
  rhythmEyebrow: string;
  rhythmCards: LandingWorkflowRhythmCard[];
}

export interface LandingContent {
  featureCards: LandingFeatureCard[];
  howItWorksSteps: LandingHowItWorksStep[];
  workflow: LandingWorkflowCopy;
}

import landingData from "@/json/landing.json";

const featureCards = landingData.featureCards as LandingFeatureCard[];

const howItWorksSteps = landingData.howItWorksSteps as LandingHowItWorksStep[];

const LANDING_WORKFLOW_COPY_DEFAULTS: LandingWorkflowCopy = {
  eyebrow: "How it works",
  title: "Not another empty prompt box.",
  description:
    "Droplet gives the conversation structure from the first click. You choose the persona, set the task, and keep the thread alive as the work gets more specific.",
  rhythmEyebrow: "Conversation rhythm",
  rhythmCards: [
    {
      label: "You",
      detail:
        "Build me a launch plan for a small SaaS with a free tier and two paid plans.",
    },
    {
      label: "Strategist",
      detail:
        "Here is the sequence: pricing truth first, navigation second, then plan-aware messaging so the site and product say the same thing.",
    },
    {
      label: "Result",
      detail:
        "You leave with concrete next actions instead of another vague wall of AI text.",
    },
  ],
};

export function getDefaultLandingContent(): LandingContent {
  return {
    featureCards: featureCards.map((card) => ({ ...card })),
    howItWorksSteps: howItWorksSteps.map((step) => ({ ...step })),
    workflow: {
      ...LANDING_WORKFLOW_COPY_DEFAULTS,
      rhythmCards: LANDING_WORKFLOW_COPY_DEFAULTS.rhythmCards.map((card) => ({
        ...card,
      })),
    },
  };
}
