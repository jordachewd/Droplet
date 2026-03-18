import { TaskEndedReason } from "@/types/TaskData.d";

export const STOP_REASON_MESSAGES: Record<TaskEndedReason, string> = {
  prompt_limit_reached:
    "You've reached the message limit for this conversation.",
  trial_limit_reached:
    "You've reached the trial limit for this persona conversation.",
  media_limit_reached: "You've reached your media generation limit.",
  image_limit_reached:
    "You've reached your image generation limit for this billing period.",
  audio_limit_reached:
    "You've reached your audio generation limit for this billing period.",
  video_limit_reached:
    "You've reached your video generation limit for this billing period.",
  daily_conversation_limit_reached:
    "You've reached the daily conversation limit for your plan.",
  conversation_storage_limit_reached:
    "This conversation has reached its storage limit.",
  billing_state_invalid: "Your plan has expired.",
};
