// ====== USER Data Types
import { PlanData } from "./PlanData.d";

export type UserRoles = "client" | "admin";

export interface ClerkUserData {
  userId: string;
  clerkId: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
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
  userimg?: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  updatedAt: Date;
  plan?: PlanData;
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
  plan: PlanData;
  __v: number;
}
