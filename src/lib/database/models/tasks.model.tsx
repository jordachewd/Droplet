import { ContentItem, Message } from "@/types";
import { Schema, model, models, Document } from "mongoose";

interface ITask extends Document {
  userId: string;
  title: string;
  messages: Message[];
  assistantRoleId: string;
  createdAt?: Date;
  updatedAt?: Date;
  usage?: number;
}

const ContentItemSchema = new Schema<ContentItem>({
  type: { type: String, required: true },
  text: { type: String },
  image_url: {
    url: { type: String, default: null },
  },
  audio_url: { type: String },
});

const MessageSchema = new Schema<Message>({
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
});

const TaskSchema = new Schema<ITask>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  messages: { type: [MessageSchema], required: true },
  assistantRoleId: {
    type: String,
    required: true,
    default: "strategist",
    index: true,
  },
  usage: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

TaskSchema.index({ userId: 1, updatedAt: -1 });
TaskSchema.index({ updatedAt: -1 });

const Task = models?.Task || model<ITask>("Task", TaskSchema);
export default Task;
