import { SUPPORT_EMAIL } from "@/constants/support";

export const faqs = [
  {
    id: 0,
    question:
      "How does Droplet ensure the security of my personal information?",
    answer:
      "Droplet prioritizes the protection of your personal information. " +
      "We implement advanced security protocols to safeguard your data. " +
      "For comprehensive details, please review our Privacy Policy.",
  },
  {
    id: 1,
    question: "Who should I reach out to for assistance or inquiries?",
    answer: `For any questions or support needs, please contact our customer support team at ${SUPPORT_EMAIL}.`,
  },
  {
    id: 2,
    question: "What is the process to cancel my subscription?",
    answer:
      "Droplet currently treats paid plans as one-time purchases for the active access period rather than auto-renewing subscriptions. " +
      `If you need billing help or a manual review, contact ${SUPPORT_EMAIL}.`,
  },
  {
    id: 3,
    question: "What subscription plans does Droplet offer?",
    answer:
      "Droplet offers Lite for free forever, Pro for $19, and Premium for $39. " +
      "Persona access is plan-gated: Lite has 3 personas, Pro has 7 personas, and Premium unlocks all 10 personas, while paid tiers also raise usage and media limits.",
  },
  {
    id: 4,
    question:
      "Is it possible to use Droplet on multiple devices at the same time?",
    answer: "Yes, Droplet can be accessed on multiple devices simultaneously.",
  },
  {
    id: 5,
    question: "How do I update my account information?",
    answer:
      "Sign in to Droplet and open your profile area under /app/profile to review your current account details and plan information.",
  },
  {
    id: 6,
    question: "Does Droplet have a free plan?",
    answer:
      "Yes, every new account starts with our Lite plan which is free forever. " +
      "You can upgrade to Pro or Premium anytime for additional features and higher limits.",
  },
];
