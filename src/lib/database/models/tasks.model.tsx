import { ContentItem, Message } from "@/types";
import { TaskEndAction, TaskEndedReason, TaskStatus } from "@/types/TaskData.d";
import { Schema, model, models, Document } from "mongoose";

interface ITask extends Document {
  userId: string;
  title: string;
  messages: Message[];
  personaId: string;
  promptCount: number;
  mediaCount: number;
  estimatedBytes: number;
  status: TaskStatus;
  endedAt?: Date;
  endedReason?: TaskEndedReason;
  endAction?: TaskEndAction;
  createdAt?: Date;
  updatedAt?: Date;
  usage?: number;
}

const ContentItemSchema = new Schema<ContentItem>(
  {
    type: { type: String, required: true },
    text: { type: String },
    image_url: {
      url: { type: String, default: null },
    },
    audio_url: { type: String },
    video_url: { type: String },
  },
  { _id: false },
);

const MessageSchema = new Schema<Message>(
  {
    whois: {
      type: String,
      enum: ["user", "assistant", "system", "developer"],
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system", "developer"],
      required: true,
    },
    content: { type: [ContentItemSchema], required: true },
  },
  { _id: false },
);

const TaskSchema = new Schema<ITask>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  messages: { type: [MessageSchema], required: true },
  personaId: {
    type: String,
    required: true,
    default: "strategist",
    index: true,
  },
  usage: { type: Number, required: true, default: 0 },
  promptCount: { type: Number, required: true, default: 0 },
  mediaCount: { type: Number, required: true, default: 0 },
  estimatedBytes: { type: Number, required: true, default: 0 },
  status: {
    type: String,
    required: true,
    enum: ["active", "ended"],
    default: "active",
  },
  endedAt: { type: Date },
  endedReason: {
    type: String,
    enum: [
      "prompt_limit_reached",
      "media_limit_reached",
      "daily_conversation_limit_reached",
      "conversation_storage_limit_reached",
      "billing_state_invalid",
    ],
  },
  endAction: {
    type: String,
    enum: ["start_new_conversation", "upgrade_plan", "contact_support"],
  },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

TaskSchema.index({ userId: 1, updatedAt: -1 });
TaskSchema.index({ userId: 1, createdAt: -1 });
TaskSchema.index({ updatedAt: -1 });

const Task = models?.Task || model<ITask>("Task", TaskSchema);
export default Task;
