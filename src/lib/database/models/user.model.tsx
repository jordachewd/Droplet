import "server-only";
import { getExpiresOn } from "@/constants/plans";
import { PlanData } from "@/types/PlanData.d";
import {
  UserRoles,
  UserPreferences,
} from "@/types/UserData.d";
import { Schema, model, models, Document } from "mongoose";

type SubscriptionStatus = "active" | "past_due" | "canceled" | "unpaid";

interface IUser extends Document {
  clerkId: string;
  username: string;
  email: string;
  role: UserRoles;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus | null;
  suspended?: boolean;
  registerAt: Date;
  plan: PlanData;
  dailyConversationsStarted: number;
  dailyConversationWindowStart?: Date | null;
  onboardingCompleted: boolean;
  preferences?: UserPreferences;
  firstName?: string;
  lastName?: string;
  updatedAt?: Date;
  userimg?: string;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["client", "admin"],
      default: "client",
    },
    stripeCustomerId: {
      type: String,
      unique: true,
      sparse: true,
    },
    stripeSubscriptionId: {
      type: String,
      index: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "past_due", "canceled", "unpaid"],
      default: null,
      index: true,
    },
    suspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    registerAt: { type: Date, default: Date.now, required: true },
    plan: {
      id: { type: Number, required: true, default: 0 },
      name: {
        type: String,
        required: true,
        enum: ["Lite", "Pro", "Premium"],
        default: "Lite",
      },
      amount: { type: Number, required: true, default: 0 },
      billing: {
        type: String,
        required: true,
        enum: ["Monthly", "Yearly"],
        default: "Monthly",
      },
      startedOn: { type: Date, required: true, default: Date.now },
      expiresOn: {
        type: Date,
        required: true,
        default: () => getExpiresOn("Lite"),
      },
      stripeId: { type: String },
      stripeSubscriptionId: { type: String },
      subscriptionStatus: {
        type: String,
        enum: ["active", "past_due", "canceled", "unpaid"],
        default: null,
      },
      cancelAtPeriodEnd: { type: Boolean, default: false },
      imageGenerations: { type: Number, default: 0 },
      audioGenerations: { type: Number, default: 0 },
      usagePeriodStart: { type: Date, default: Date.now },
      trialUsage: {
        trialImageGenerations: { type: Number, default: 0 },
        trialAudioGenerations: { type: Number, default: 0 },
        trialUsagePeriodStart: { type: Date, default: Date.now },
      },
    },
    dailyConversationsStarted: {
      type: Number,
      default: 0,
    },
    dailyConversationWindowStart: {
      type: Date,
      default: null,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    preferences: {
      intent: {
        type: String,
        enum: ["productivity", "learning", "creative", "technical", "career"],
      },
      challenge: {
        type: String,
        enum: ["decisions", "learning", "content", "software", "wellness"],
      },
      expectation: {
        type: String,
        enum: ["direct", "guided", "challenger", "explorer"],
      },
      communicationStyle: {
        type: String,
        enum: ["concise", "detailed", "structured", "conversational"],
      },
      defaultPersonaId: { type: String },
      onboardedAt: { type: Date },
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    updatedAt: { type: Date, default: Date.now },
    userimg: { type: String },
  },
  { strict: true },
);

const User = models?.User || model<IUser>("User", UserSchema);

export default User;
