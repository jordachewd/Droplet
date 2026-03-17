import { AlertParams } from "@/types/AlertData.d";

export type AdminActionStatus = "idle" | "success" | "error";

export interface AdminActionState {
  status: AdminActionStatus;
  message: string;
  severity?: AlertParams["severity"];
}

export const ADMIN_ACTION_INITIAL_STATE: AdminActionState = {
  status: "idle",
  message: "",
};
