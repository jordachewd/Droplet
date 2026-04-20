import type {
  UserIntent,
  UserChallenge,
  UserExpectation,
  UserCommunicationStyle,
} from "@/types/UserData.d";
import type { PersonaId } from "@/types/PersonaData.d";

export interface OnboardingOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  options:
    | OnboardingOption<UserIntent>[]
    | OnboardingOption<UserChallenge>[]
    | OnboardingOption<UserExpectation>[]
    | OnboardingOption<UserCommunicationStyle>[];
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "intent",
    title: "What brings you to Droplet?",
    subtitle: "No wrong answers. This helps us match you with the right tools.",
    options: [
      {
        value: "productivity",
        label: "Get work done faster",
        description: "Decisions, planning, strategy — the stuff that moves projects forward.",
      },
      {
        value: "learning",
        label: "Learn and understand better",
        description: "Break down complex topics. Build real knowledge, not surface-level summaries.",
      },
      {
        value: "creative",
        label: "Work on creative projects",
        description: "Writing, design thinking, content — bring ideas to life.",
      },
      {
        value: "technical",
        label: "Code and technical work",
        description: "Build, debug, ship. Practical engineering support.",
      },
      {
        value: "career",
        label: "Career guidance and interview prep",
        description: "Job readiness, interview practice, professional growth.",
      },
    ] satisfies OnboardingOption<UserIntent>[],
  },
  {
    id: "challenge",
    title: "What's your biggest challenge right now?",
    subtitle: "Be honest. We work better when we know what you're dealing with.",
    options: [
      {
        value: "decisions",
        label: "Making decisions without enough data",
        description: "Too many options, not enough clarity.",
      },
      {
        value: "learning",
        label: "Learning complex topics quickly",
        description: "Need to understand something deeply, on a deadline.",
      },
      {
        value: "content",
        label: "Writing, designing, or producing content",
        description: "The blank page problem. Getting from idea to output.",
      },
      {
        value: "software",
        label: "Building, debugging, or shipping software",
        description: "Code that works. Architecture that holds. Bugs that die.",
      },
      {
        value: "wellness",
        label: "Staying focused and managing stress",
        description: "Productivity is nothing without sustainability.",
      },
    ] satisfies OnboardingOption<UserChallenge>[],
  },
  {
    id: "expectation",
    title: "What do you expect from a Droplet assistant?",
    subtitle: "This shapes how your assistant communicates with you.",
    options: [
      {
        value: "direct",
        label: "Straight answers. No filler.",
        description: "Say what needs to be said. Skip the pleasantries.",
      },
      {
        value: "guided",
        label: "Step-by-step guidance",
        description: "Walk me through it. Structure helps me think.",
      },
      {
        value: "challenger",
        label: "Challenge my thinking",
        description: "Push back. Ask hard questions. Make me reconsider.",
      },
      {
        value: "explorer",
        label: "Help me brainstorm and explore",
        description: "Open-ended thinking. Follow the threads.",
      },
    ] satisfies OnboardingOption<UserExpectation>[],
  },
  {
    id: "communicationStyle",
    title: "How do you like to receive information?",
    subtitle: "Your assistant adapts to your style.",
    options: [
      {
        value: "concise",
        label: "Short and sharp",
        description: "Three sentences beats three paragraphs.",
      },
      {
        value: "detailed",
        label: "Detailed with examples",
        description: "Show me the full picture. I'll filter what I need.",
      },
      {
        value: "structured",
        label: "Structured — lists, tables, code blocks",
        description: "Organized output I can scan and reference.",
      },
      {
        value: "conversational",
        label: "Conversational — like a colleague",
        description: "Natural flow. Think out loud together.",
      },
    ] satisfies OnboardingOption<UserCommunicationStyle>[],
  },
];

interface PersonaScore {
  personaId: PersonaId;
  score: number;
}

const INTENT_PERSONA_WEIGHTS: Record<UserIntent, Partial<Record<PersonaId, number>>> = {
  productivity: { strategist: 3, developer: 1 },
  learning: { teacher: 3, strategist: 1 },
  creative: { creator: 3, wellness: 1 },
  technical: { developer: 3, strategist: 1 },
  career: { interviewer: 3, strategist: 1 },
};

const CHALLENGE_PERSONA_WEIGHTS: Record<UserChallenge, Partial<Record<PersonaId, number>>> = {
  decisions: { strategist: 3, teacher: 1 },
  learning: { teacher: 3, developer: 1 },
  content: { creator: 3, teacher: 1 },
  software: { developer: 3, strategist: 1 },
  wellness: { wellness: 3, teacher: 1 },
};

export function recommendPersona(
  intent: UserIntent,
  challenge: UserChallenge,
): PersonaId {
  const scores = new Map<PersonaId, number>();
  const allPersonas: PersonaId[] = [
    "strategist", "teacher", "developer", "creator", "wellness", "interviewer",
  ];

  for (const p of allPersonas) {
    scores.set(p, 0);
  }

  const intentWeights = INTENT_PERSONA_WEIGHTS[intent];
  for (const [pid, weight] of Object.entries(intentWeights)) {
    scores.set(pid as PersonaId, (scores.get(pid as PersonaId) ?? 0) + weight);
  }

  const challengeWeights = CHALLENGE_PERSONA_WEIGHTS[challenge];
  for (const [pid, weight] of Object.entries(challengeWeights)) {
    scores.set(pid as PersonaId, (scores.get(pid as PersonaId) ?? 0) + weight);
  }

  const sorted: PersonaScore[] = allPersonas
    .map((pid) => ({ personaId: pid, score: scores.get(pid) ?? 0 }))
    .sort((a, b) => b.score - a.score);

  return sorted[0].personaId;
}
