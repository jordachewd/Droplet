// ====== USER Data Types
import { PlanData } from "./PlanData.d";
import { PersonaId } from "./PersonaData.d";

export type UserRoles = "client" | "admin";

export type UserIntent =
  | "productivity"
  | "learning"
  | "creative"
  | "technical"
  | "career";

export type UserChallenge =
  | "decisions"
  | "learning"
  | "content"
  | "software"
  | "wellness";

export type UserExpectation = "direct" | "guided" | "challenger" | "explorer";

export type UserCommunicationStyle =
  | "concise"
  | "detailed"
  | "structured"
  | "conversational";

export interface UserPreferences {
  intent?: UserIntent;
  challenge?: UserChallenge;
  expectation?: UserExpectation;
  communicationStyle?: UserCommunicationStyle;
  defaultPersonaId?: PersonaId;
  onboardedAt?: Date;
}

/* Used by Clerk Webhook ("user.created") */
export interface CreateUserParams {
  clerkId: string;
  userimg: string;
  email: string;
  username: string;
  firstName: string | undefined;
  lastName: string | undefined;
  registerAt: Date;
}

/* Used by Clerk Webhook ("user.updated") */
export interface UpdateUserParams {
  email?: string;
  username?: string;
  userimg?: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: PlanData["subscriptionStatus"];
  updatedAt: Date;
  plan?: PlanData;
  suspended?: boolean;
}

/* When pull user from DataBase */
export interface UserData {
  _id: string;
  clerkId: string;
  username: string;
  email: string;
  role: UserRoles;
  registerAt: Date;
  firstName?: string;
  lastName?: string;
  updatedAt?: Date;
  userimg?: string;
  suspended?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: PlanData["subscriptionStatus"];
  dailyConversationsStarted?: number;
  dailyConversationWindowStart?: Date | null;
  onboardingCompleted?: boolean;
  preferences?: UserPreferences;
  plan: PlanData;
  __v: number;
}
