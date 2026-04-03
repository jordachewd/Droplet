import "server-only";

import { TaskEndedReason } from "@/types/TaskData.d";

export const STOP_REASON_CODES = [
  "prompt_limit_reached",
  "trial_limit_reached",
  "media_limit_reached",
  "image_limit_reached",
  "audio_limit_reached",
  "daily_conversation_limit_reached",
  "conversation_storage_limit_reached",
  "billing_state_invalid",
] as const satisfies readonly TaskEndedReason[];

export const STOP_REASON_MESSAGES: Record<TaskEndedReason, string> = {
  prompt_limit_reached:
    "You've reached the message limit for this conversation.",
  trial_limit_reached:
    "You've reached the trial limit for this persona conversation.",
  media_limit_reached:
    "You've reached your media generation limit. You can continue chatting. Start a new conversation to keep going.",
  image_limit_reached:
    "You've reached your image generation limit for this billing period. You can continue chatting. Start a new conversation to keep going.",
  audio_limit_reached:
    "You've reached your audio generation limit for this billing period. You can continue chatting. Start a new conversation to keep going.",
  daily_conversation_limit_reached:
    "You've reached the daily conversation limit for your plan.",
  conversation_storage_limit_reached:
    "This conversation has reached its storage limit.",
  billing_state_invalid: "Your plan has expired.",
};
