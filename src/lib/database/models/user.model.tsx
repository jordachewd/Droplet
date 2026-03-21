import "server-only";
import { getExpiresOn } from "@/constants/plans";
import { PlanData } from "@/types/PlanData.d";
import { UserRoles } from "@/types/UserData.d";
import { Schema, model, models, Document } from "mongoose";

interface IUser extends Document {
  clerkId: string;
  username: string;
  email: string;
  role: UserRoles;
  suspended?: boolean;
  registerAt: Date;
  plan: PlanData;
  dailyConversationsStarted: number;
  dailyConversationWindowStart?: Date | null;
  firstName?: string;
  lastName?: string;
  updatedAt?: Date;
  userimg?: string;
}

const UserSchema = new Schema<IUser>({
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
  suspended: {
    type: Boolean,
    default: false,
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
    imageGenerations: { type: Number, default: 0 },
    audioGenerations: { type: Number, default: 0 },
    videoGenerations: { type: Number, default: 0 },
    usagePeriodStart: { type: Date, default: Date.now },
    trialUsage: {
      trialImageGenerations: { type: Number, default: 0 },
      trialAudioGenerations: { type: Number, default: 0 },
      trialVideoGenerations: { type: Number, default: 0 },
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
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  updatedAt: { type: Date, default: Date.now },
  userimg: { type: String },
});

const User = models?.User || model<IUser>("User", UserSchema);

export default User;
