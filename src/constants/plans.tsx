import { BillingCycle, PlanName } from "@/types/PlanData.d";

const LITE_NEVER_EXPIRES_ON = "9999-12-31T23:59:59.999Z";

export type PlanLimits = Record<
  PlanName,
  {
    images: number;
    audio: number;
    video: number;
    conversationsPerDay: number;
    promptsPerConversation: number;
  }
>;

export const PLAN_LIMITS: PlanLimits = {
  Lite: {
    images: 3,
    audio: 3,
    video: 0,
    conversationsPerDay: 5,
    promptsPerConversation: 10,
  },
  Pro: {
    images: 50,
    audio: 50,
    video: 0,
    conversationsPerDay: 50,
    promptsPerConversation: 100,
  },
  Premium: {
    images: -1,
    audio: -1,
    video: 10,
    conversationsPerDay: -1,
    promptsPerConversation: -1,
  },
};

export function getExpiresOn(plan: PlanName, billing?: BillingCycle): Date {
  const currentDate = new Date();

  switch (plan) {
    case "Lite":
      return new Date(LITE_NEVER_EXPIRES_ON);
    case "Pro":
    case "Premium":
      switch (billing) {
        case "Monthly":
          return new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        case "Yearly":
          return new Date(
            currentDate.setFullYear(currentDate.getFullYear() + 1),
          );
      }
  }

  return new Date(currentDate);
}

export const plans = [
  {
    id: 0,
    price: 0,
    name: "Lite" as PlanName,
    desc: "Free forever",
    icon: "bi bi-lightning",
    inclusions: [
      {
        label: "AI chat assistant",
        isIncluded: true,
      },
      {
        label: "All 9 personas",
        isIncluded: true,
      },
      {
        label: "5 conversations per day",
        isIncluded: true,
      },
      {
        label: "10 messages per conversation",
        isIncluded: true,
      },
      {
        label: "3 media generations per month",
        isIncluded: true,
      },
      {
        label: "File uploads (limited)",
        isIncluded: true,
      },
      {
        label: "Email support",
        isIncluded: false,
      },
      {
        label: "Premium media features",
        isIncluded: false,
      },
    ],
  },
  {
    id: 1,
    price: 19,
    name: "Pro" as PlanName,
    desc: "Advanced AI for power users",
    icon: "bi bi-stars",
    inclusions: [
      {
        label: "Advanced AI model (gpt-5.2-pro)",
        isIncluded: true,
      },
      {
        label: "All 9 personas",
        isIncluded: true,
      },
      {
        label: "50 conversations per day",
        isIncluded: true,
      },
      {
        label: "100 messages per conversation",
        isIncluded: true,
      },
      {
        label: "50 image generations per month",
        isIncluded: true,
      },
      {
        label: "50 audio generations per month",
        isIncluded: true,
      },
      {
        label: "Unlimited file uploads",
        isIncluded: true,
      },
      {
        label: "Email support",
        isIncluded: true,
      },
      {
        label: "Premium media features",
        isIncluded: false,
      },
    ],
  },
  {
    id: 2,
    price: 39,
    name: "Premium" as PlanName,
    desc: "Ultimate AI experience with premium media",
    icon: "bi bi-gem",
    inclusions: [
      {
        label: "Best AI model (gpt-5.4-pro)",
        isIncluded: true,
      },
      {
        label: "All 9 personas",
        isIncluded: true,
      },
      {
        label: "Unlimited conversations",
        isIncluded: true,
      },
      {
        label: "Unlimited messages",
        isIncluded: true,
      },
      {
        label: "Unlimited image generations",
        isIncluded: true,
      },
      {
        label: "Unlimited audio generations",
        isIncluded: true,
      },
      {
        label: "Quality image generation (Premium)",
        isIncluded: true,
      },
      {
        label: "Quality audio generation (Premium)",
        isIncluded: true,
      },
      {
        label: "Video generation - 10/month (Premium)",
        isIncluded: true,
      },
      {
        label: "Priority email support",
        isIncluded: true,
      },
    ],
  },
];

export function getPlanIcon(name: PlanName) {
  if (!name) return;

  const plan = plans.find(
    (plan) => plan.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );

  if (!plan) {
    throw new Error(`No plan found with the name: ${name}`);
  }

  return plan.icon;
}
