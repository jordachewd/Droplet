import { BillingCycle, PlanName } from "@/types/PlanData.d";

export type PlanLimits = Record<PlanName, { images: number; audio: number }>;

export const PLAN_LIMITS: PlanLimits = {
  Lite: { images: 3, audio: 0 },
  Pro: { images: 20, audio: 20 },
  Premium: { images: -1, audio: -1 },
};

export function getExpiresOn(plan: PlanName, billing?: BillingCycle): Date {
  const currentDate = new Date();
  let expiresOn: Date = new Date();

  switch (plan) {
    case "Lite":
      expiresOn = new Date(currentDate.setDate(currentDate.getDate() + 3));
      break;
    case "Pro":
    case "Premium":
      switch (billing) {
        case "Monthly":
          expiresOn = new Date(
            currentDate.setMonth(currentDate.getMonth() + 1),
          );
          break;
        case "Yearly":
          expiresOn = new Date(
            currentDate.setFullYear(currentDate.getFullYear() + 1),
          );
          break;
      }
      break;
  }

  return expiresOn;
}

export const plans = [
  {
    id: 0,
    price: 0,
    name: "Lite" as PlanName,
    desc: "Free trial for 3 days",
    icon: "bi bi-clock-history",
    inclusions: [
      {
        label: "Full AI model",
        isIncluded: true,
      },
      {
        label: "Messaging and file uploads (limited)",
        isIncluded: true,
      },
      {
        label: "Web browsing and data analysis (limited)",
        isIncluded: true,
      },
      {
        label: "3 image and/or audio generation (limited)",
        isIncluded: true,
      },
      {
        label: "3 text to speach and/or voice inputs (limited)",
        isIncluded: true,
      },
      {
        label: "Secure and private",
        isIncluded: true,
      },
      {
        label: "Email support",
        isIncluded: false,
      },
      {
        label: "Opportunities to test new features",
        isIncluded: false,
      },
    ],
  },
  {
    id: 1,
    price: 29,
    name: "Pro" as PlanName,
    desc: "Best for personal projects",
    icon: "bi bi-stars",
    inclusions: [
      {
        label: "Full AI model",
        isIncluded: true,
      },
      {
        label: "Messaging and file uploads (unlimited)",
        isIncluded: true,
      },
      {
        label: "Web browsing and data analysis (unlimited)",
        isIncluded: true,
      },
      {
        label: "20/Mo image and/or audio generation",
        isIncluded: true,
      },
      {
        label: "20/Mo text to speach and/or voice inputs",
        isIncluded: true,
      },
      {
        label: "Secure and private",
        isIncluded: true,
      },
      {
        label: "Email support",
        isIncluded: true,
      },
      {
        label: "Opportunities to test new features",
        isIncluded: false,
      },
    ],
  },
  {
    id: 2,
    price: 69,
    name: "Premium" as PlanName,
    desc: "Best for businesses",
    icon: "bi bi-gem",
    inclusions: [
      {
        label: "Single-provider OpenAI stack",
        isIncluded: true,
      },
      {
        label: "Messaging and file uploads (unlimited)",
        isIncluded: true,
      },
      {
        label: "Web browsing and data analysis (unlimited)",
        isIncluded: true,
      },
      {
        label: "Image and audio generation (unlimited)",
        isIncluded: true,
      },
      {
        label: "Text to speach and voice inputs (unlimited)",
        isIncluded: true,
      },
      {
        label: "Secure and private",
        isIncluded: true,
      },
      {
        label: "Priority email support",
        isIncluded: true,
      },
      {
        label: "Opportunities to test new features",
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
