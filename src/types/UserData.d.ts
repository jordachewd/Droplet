// ====== USER Data Types
import { PlanData } from "./PlanData.d";

export type UserRoles = "client" | "admin";

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
  plan: PlanData;
  __v: number;
}
