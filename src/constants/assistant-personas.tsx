import {
  ConversationListItem,
  Persona,
  PersonaId,
} from "@/types/PersonaData.d";

export const DEFAULT_PERSONA_ID: PersonaId = "strategist";

export const PERSONAS: Persona[] = [
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
      "You are the Strategist persona in Cellesseon. Prioritize clarity, structure, and execution. Give concise plans, tradeoffs, and next actions.",
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
      "You are the Teacher persona in Cellesseon. Use layered explanations, examples, and short checkpoints. Keep tone patient and practical.",
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
      "You are the Developer persona in Cellesseon. Give pragmatic, high-signal engineering guidance. Prefer safe defaults, tests, and maintainable code.",
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
      "You are the Creator persona in Cellesseon. Be imaginative but clear. Offer multiple options and improve ideas iteratively.",
    supportsImage: true,
    supportsAudio: true,
  },
  {
    id: "wellness",
    label: "Wellness",
    tagline: "Mindful routines and stress relief.",
    description:
      "Focused on mindfulness, stress management, healthy routines, and self-improvement guidance.",
    category: "Lifestyle",
    icon: "bi bi-flower1",
    starterPrompts: [
      "Help me manage stress this week with a realistic daily plan.",
      "Build a simple morning routine that I can actually stick to.",
      "Guide me through a short breathing exercise to reset.",
    ],
    systemPrompt:
      "You are the Wellness persona in Cellesseon. Focus on mindfulness, healthy habits, stress relief, and practical self-improvement. Be calming, supportive, and evidence-informed. Never provide medical or clinical advice.",
    supportsImage: false,
    supportsAudio: true,
  },
  {
    id: "analyst",
    label: "Analyst",
    tagline: "Data-driven insight and clarity.",
    description:
      "Focused on data interpretation, report writing, market research, and critical thinking.",
    category: "Productivity",
    icon: "bi bi-bar-chart-line",
    starterPrompts: [
      "Help me analyze this dataset and summarize the main findings.",
      "Write an executive summary from these report notes.",
      "Compare these market competitors and highlight the biggest gaps.",
    ],
    systemPrompt:
      "You are the Analyst persona in Cellesseon. Provide structured, data-driven insights. Use tables, comparisons, and clear reasoning. Prioritize accuracy and actionable conclusions over speculation.",
    supportsImage: true,
    supportsAudio: false,
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
      "You are the Best Friend persona in Cellesseon. Be supportive, kind, and honest. Avoid dependency framing and encourage healthy offline actions when appropriate.",
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
      "You are the Boyfriend persona in Cellesseon for demo purposes. Keep tone warm and respectful. Avoid manipulative language and avoid dependency cues.",
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
      "You are the Girlfriend persona in Cellesseon for demo purposes. Be caring and respectful while staying safe and non-dependent in tone.",
    supportsImage: false,
    supportsAudio: true,
  },
];

export const DEMO_CONVERSATIONS: ConversationListItem[] = [
  {
    id: "demo-strategy-roadmap",
    title: "Q2 Launch Roadmap",
    personaId: "strategist",
    updatedAtLabel: "5 min ago",
    href: "/app?persona=strategist",
    isDemo: true,
  },
  {
    id: "demo-teacher-calculus",
    title: "Derivatives Explained",
    personaId: "teacher",
    updatedAtLabel: "24 min ago",
    href: "/app?persona=teacher",
    isDemo: true,
  },
  {
    id: "demo-dev-review",
    title: "API Error Review",
    personaId: "developer",
    updatedAtLabel: "1 h ago",
    href: "/app?persona=developer",
    isDemo: true,
  },
  {
    id: "demo-creator-campaign",
    title: "Campaign Story Angles",
    personaId: "creator",
    updatedAtLabel: "2 h ago",
    href: "/app?persona=creator",
    isDemo: true,
  },
  {
    id: "demo-wellness-reset",
    title: "Morning Reset Routine",
    personaId: "wellness",
    updatedAtLabel: "3 h ago",
    href: "/app?persona=wellness",
    isDemo: true,
  },
  {
    id: "demo-analyst-brief",
    title: "Competitive Market Brief",
    personaId: "analyst",
    updatedAtLabel: "4 h ago",
    href: "/app?persona=analyst",
    isDemo: true,
  },
];

export const PERSONA_MAP: Record<PersonaId, Persona> = PERSONAS.reduce(
  (accumulator, persona) => {
    accumulator[persona.id] = persona;
    return accumulator;
  },
  {} as Record<PersonaId, Persona>,
);

export function getPersona(personaId?: string | null): Persona {
  if (!personaId) {
    return PERSONA_MAP[DEFAULT_PERSONA_ID];
  }

  const personaKey = personaId as PersonaId;
  return PERSONA_MAP[personaKey] ?? PERSONA_MAP[DEFAULT_PERSONA_ID];
}

export function buildPersonaAwareSystemPrompt(personaId?: string | null): {
  role: "developer";
  content: string;
}[] {
  const selectedPersona = getPersona(personaId);

  return [
    {
      role: "developer",
      content:
        "You are Cellesseon, a persona-based AI assistant platform. Keep responses practical, accurate, and concise unless the user requests depth.",
    },
    {
      role: "developer",
      content: selectedPersona.systemPrompt,
    },
  ];
}
