import {
  ASSISTANT_ROLES,
  DEFAULT_ASSISTANT_ROLE_ID,
  getAssistantRole,
} from "@/constants/assistant-roles";
import { AssistantRoleId } from "@/types/AssistantRoleData.d";
import { PlanName } from "@/types/PlanData.d";

export interface Entitlements {
  planName: PlanName;
  allowedRoleIds: AssistantRoleId[];
  supportsImageGeneration: boolean;
  supportsAudioGeneration: boolean;
}

export function resolveEntitlements(planName?: PlanName | null): Entitlements {
  const normalizedPlan: PlanName = planName ?? "Lite";

  if (normalizedPlan === "Premium") {
    return {
      planName: normalizedPlan,
      allowedRoleIds: ASSISTANT_ROLES.map((role) => role.id),
      supportsImageGeneration: true,
      supportsAudioGeneration: true,
    };
  }

  if (normalizedPlan === "Pro") {
    return {
      planName: normalizedPlan,
      allowedRoleIds: ASSISTANT_ROLES.map((role) => role.id),
      supportsImageGeneration: true,
      supportsAudioGeneration: true,
    };
  }

  return {
    planName: "Lite",
    allowedRoleIds: [
      "strategist",
      "teacher",
      "developer",
      "creator",
      "best-friend",
    ],
    supportsImageGeneration: true,
    supportsAudioGeneration: false,
  };
}

export function resolveAssistantRoleForPlan({
  assistantRoleId,
  planName,
}: {
  assistantRoleId?: string | null;
  planName?: PlanName | null;
}) {
  const entitlements = resolveEntitlements(planName);
  const selectedRole = getAssistantRole(assistantRoleId);

  if (entitlements.allowedRoleIds.includes(selectedRole.id)) {
    return selectedRole;
  }

  const fallbackRoleId =
    entitlements.allowedRoleIds[0] ?? DEFAULT_ASSISTANT_ROLE_ID;
  return getAssistantRole(fallbackRoleId);
}
