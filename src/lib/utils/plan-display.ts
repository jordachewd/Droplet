import type { PlanLimits } from "@/constants/plans";
import type { PlanName } from "@/types/PlanData.d";
import type { UserRoles } from "@/types/UserData.d";

export const ADMIN_PLAN_LABEL = "ADMIN";

export const UNLIMITED_USAGE_LIMITS: PlanLimits[PlanName] = {
  conversationsPerDay: -1,
  promptsPerConversation: -1,
  images: -1,
  audio: -1,
};

export function isAdminRole(role?: UserRoles | string | null): boolean {
  return role === "admin";
}

export function getDisplayPlanName({
  role,
  planName,
}: {
  role?: UserRoles | string | null;
  planName: PlanName;
}): string {
  return isAdminRole(role) ? ADMIN_PLAN_LABEL : planName;
}

export function getDisplayUsageLimit({
  role,
  limit,
}: {
  role?: UserRoles | string | null;
  limit: number;
}): number {
  return isAdminRole(role) ? -1 : limit;
}
