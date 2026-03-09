import { getExpiresOn } from "@/constants/plans";
import { PlanData } from "@/types/PlanData.d";
import { UserRoles } from "@/types/UserData.d";
import { Schema, model, models, Document } from "mongoose";

interface IUser extends Document {
  clerkId: string;
  username: string;
  email: string;
  role: UserRoles;
  registerAt: Date;
  plan: PlanData;
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
  },
  role: {
    type: String,
    required: true,
    enum: ["client", "admin"],
    default: "client",
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
    expiresOn: { type: Date, required: true, default: getExpiresOn("Lite") },
    stripeId: { type: String },
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
