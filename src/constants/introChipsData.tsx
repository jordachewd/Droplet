/* Chat intro prompt usage examples */
import { Chip } from "@/types";
export const IntroChips: Chip[] = [
  {
    id: 0,
    label: "Ask anything",
    icon: "bi bi-brilliance",
    options: [
      {
        id: 0,
        label: "What's your dream mythical creature and why?",
      },
      {
        id: 1,
        label: "Plan a $200 weekend trip emphasizing food, museums.",
      },
      {
        id: 2,
        label: "Share unique New Year traditions from three countries.",
      },
      {
        id: 3,
        label: "What's the best way to organize my week?",
      },
      {
        id: 4,
        label: "What's the best action after finding someone's wallet?",
      },
    ],
  },
  {
    id: 1,
    label: "Create image",
    icon: "bi bi-brush",
    options: [
      {
        id: 0,
        label: "A futuristic cityscape at sunset.",
      },
      {
        id: 1,
        label: "A serene mountain lake at dawn.",
      },
      {
        id: 2,
        label: "A magical forest glowing with fireflies.",
      },
      {
        id: 3,
        label: "An astronaut exploring a distant planet.",
      },
      {
        id: 4,
        label: "A cozy winter cabin in snowfall.",
      },
    ],
  },
  {
    id: 2,
    label: "Analyze image",
    icon: "bi bi-image",
    options: [
      {
        id: 0,
        label: "Identify objects in a street photo.",
      },
      {
        id: 1,
        label: "What's in this image? Describe it.",
      },
      {
        id: 2,
        label: "Find patterns in an abstract artwork.",
      },
      {
        id: 3,
        label: "Analyze colors of a sunset image.",
      },
      {
        id: 4,
        label: "Check symmetry in architectural designs.",
      },
    ],
  },
  {
    id: 3,
    label: "Summarize text",
    icon: "bi bi-list-stars",
    options: [
      {
        id: 0,
        label: "Summarize a news article about climate change.",
      },
      {
        id: 1,
        label: "Explain a book chapter in simple terms.",
      },
      {
        id: 2,
        label: "Condense a technical report into bullet points.",
      },
      {
        id: 3,
        label: "Summarize a speech into key takeaways.",
      },
      {
        id: 4,
        label: "Reduce a long email to core details.",
      },
    ],
  },
  {
    id: 4,
    label: "Fix code errors",
    icon: "bi bi-code-slash",
    options: [
      {
        id: 0,
        label: "Fix syntax errors in Python code.",
      },
      {
        id: 1,
        label: "Resolve React component rendering issues.",
      },
      {
        id: 2,
        label: "Debug an infinite loop in JavaScript.",
      },
      {
        id: 3,
        label: "Fix broken SQL query for database.",
      },
      {
        id: 4,
        label: "Correct typos in HTML and CSS.",
      },
    ],
  },
];
