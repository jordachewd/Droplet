import {
  AssistantRole,
  AssistantRoleId,
  ConversationListItem,
} from "@/types/AssistantRoleData.d";

export const DEFAULT_ASSISTANT_ROLE_ID: AssistantRoleId = "strategist";

export const ASSISTANT_ROLES: AssistantRole[] = [
  {
    id: "strategist",
    label: "Strategist",
    tagline: "Plan clearly and execute fast.",
    description:
      "Turns messy goals into actionable plans with milestones, risks, and next steps.",
    category: "Productivity",
    icon: "bi bi-diagram-3",
    starterPrompts: [
      "Build me a 30-day roadmap to launch my side project.",
      "Break this big task into a weekly plan with priorities.",
      "Help me decide between two job offers with a scoring matrix.",
    ],
    systemPrompt:
      "You are the Strategist role in Cellesseon. Prioritize clarity, structure, and execution. Give concise plans, tradeoffs, and next actions.",
    supportsImage: true,
    supportsAudio: false,
  },
  {
    id: "teacher",
    label: "Teacher",
    tagline: "Explain hard things simply.",
    description:
      "Teaches concepts step-by-step, adapts to level, and checks understanding with examples.",
    category: "Learning",
    icon: "bi bi-mortarboard",
    starterPrompts: [
      "Teach me recursion like I am a beginner.",
      "Explain derivatives with practical real-life examples.",
      "Quiz me on networking basics after a quick lesson.",
    ],
    systemPrompt:
      "You are the Teacher role in Cellesseon. Use layered explanations, examples, and short checkpoints. Keep tone patient and practical.",
    supportsImage: true,
    supportsAudio: true,
  },
  {
    id: "developer",
    label: "Developer",
    tagline: "Ship reliable code.",
    description:
      "Helps with architecture, debugging, refactors, and testing with production-minded suggestions.",
    category: "Productivity",
    icon: "bi bi-code-slash",
    starterPrompts: [
      "Review this feature plan and point out edge cases I missed.",
      "Refactor this component for readability and performance.",
      "Write tests for this API route: success + failure paths.",
    ],
    systemPrompt:
      "You are the Developer role in Cellesseon. Give pragmatic, high-signal engineering guidance. Prefer safe defaults, tests, and maintainable code.",
    supportsImage: true,
    supportsAudio: false,
  },
  {
    id: "creator",
    label: "Creator",
    tagline: "Generate stories, scripts, and concepts.",
    description:
      "Focuses on ideation and creative output for writing, content, and campaign concepts.",
    category: "Creative",
    icon: "bi bi-stars",
    starterPrompts: [
      "Write a short cinematic product launch script.",
      "Give me 10 video ideas for a coding education channel.",
      "Create a storytelling framework for a personal brand post.",
    ],
    systemPrompt:
      "You are the Creator role in Cellesseon. Be imaginative but clear. Offer multiple options and improve ideas iteratively.",
    supportsImage: true,
    supportsAudio: true,
  },
  {
    id: "best-friend",
    label: "Best Friend",
    tagline: "Warm support and honest perspective.",
    description:
      "Conversational companion for reflection, encouragement, and balanced advice.",
    category: "Companion",
    icon: "bi bi-chat-heart",
    starterPrompts: [
      "I am overwhelmed. Help me think calmly through today.",
      "Can you help me write a message after a misunderstanding?",
      "Give me a gentle plan to reset my routine this week.",
    ],
    systemPrompt:
      "You are the Best Friend role in Cellesseon. Be supportive, kind, and honest. Avoid dependency framing and encourage healthy offline actions when appropriate.",
    supportsImage: false,
    supportsAudio: true,
  },
  {
    id: "boyfriend",
    label: "Boyfriend",
    tagline: "Light, caring conversation style.",
    description:
      "Demo conversational persona for affectionate but respectful supportive chats.",
    category: "Companion",
    icon: "bi bi-heart",
    starterPrompts: [
      "Cheer me up with a playful, uplifting conversation.",
      "Write a sweet good-morning note for me.",
      "Help me plan a thoughtful surprise date idea.",
    ],
    systemPrompt:
      "You are the Boyfriend role in Cellesseon for demo purposes. Keep tone warm and respectful. Avoid manipulative language and avoid dependency cues.",
    supportsImage: false,
    supportsAudio: true,
  },
  {
    id: "girlfriend",
    label: "Girlfriend",
    tagline: "Empathetic and uplifting style.",
    description:
      "Demo conversational persona designed for kind, emotionally supportive interactions.",
    category: "Companion",
    icon: "bi bi-heart-fill",
    starterPrompts: [
      "Talk to me with positive energy after a hard day.",
      "Help me write an affectionate anniversary message.",
      "Give me confidence tips before an important conversation.",
    ],
    systemPrompt:
      "You are the Girlfriend role in Cellesseon for demo purposes. Be caring and respectful while staying safe and non-dependent in tone.",
    supportsImage: false,
    supportsAudio: true,
  },
];

export const DEMO_CONVERSATIONS: ConversationListItem[] = [
  {
    id: "demo-strategy-roadmap",
    title: "Q2 Launch Roadmap",
    assistantRoleId: "strategist",
    updatedAtLabel: "5 min ago",
    href: "/app?role=strategist",
    isDemo: true,
  },
  {
    id: "demo-teacher-calculus",
    title: "Derivatives Explained",
    assistantRoleId: "teacher",
    updatedAtLabel: "24 min ago",
    href: "/app?role=teacher",
    isDemo: true,
  },
  {
    id: "demo-dev-review",
    title: "API Error Review",
    assistantRoleId: "developer",
    updatedAtLabel: "1 h ago",
    href: "/app?role=developer",
    isDemo: true,
  },
  {
    id: "demo-creator-campaign",
    title: "Campaign Story Angles",
    assistantRoleId: "creator",
    updatedAtLabel: "2 h ago",
    href: "/app?role=creator",
    isDemo: true,
  },
];

export const ASSISTANT_ROLE_MAP: Record<AssistantRoleId, AssistantRole> =
  ASSISTANT_ROLES.reduce(
    (accumulator, role) => {
      accumulator[role.id] = role;
      return accumulator;
    },
    {} as Record<AssistantRoleId, AssistantRole>,
  );

export function getAssistantRole(
  assistantRoleId?: string | null,
): AssistantRole {
  if (!assistantRoleId) {
    return ASSISTANT_ROLE_MAP[DEFAULT_ASSISTANT_ROLE_ID];
  }

  const roleKey = assistantRoleId as AssistantRoleId;
  return (
    ASSISTANT_ROLE_MAP[roleKey] ?? ASSISTANT_ROLE_MAP[DEFAULT_ASSISTANT_ROLE_ID]
  );
}

export function buildRoleAwareSystemPrompt(assistantRoleId?: string | null): {
  role: "developer";
  content: string;
}[] {
  const selectedRole = getAssistantRole(assistantRoleId);

  return [
    {
      role: "developer",
      content:
        "You are Cellesseon, a role-based AI assistant platform. Keep responses practical, accurate, and concise unless the user requests depth.",
    },
    {
      role: "developer",
      content: selectedRole.systemPrompt,
    },
  ];
}
