import ChatSidebarShell from "@/components/chat/sidebar/chat-sidebar-shell";
import { auth } from "@clerk/nextjs/server";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import {
  getEffectivePersonaConfig,
  getPersonaFromConfig,
} from "@/lib/utils/effective-persona-config";
import { getRecentTasksByUserId } from "@/lib/utils/task-queries";
import { mapDateToLabel } from "@/lib/utils/map-date-to-label";
import { ConversationListItem } from "@/types/PersonaData.d";
import { PlanName } from "@/types/PlanData.d";
import { UserRoles } from "@/types/UserData.d";

export default async function ChatSidebar() {
  const { userId } = await auth();
  let history: ConversationListItem[] = [];
  let userRole: UserRoles | undefined;
  let userPlanName: PlanName | null = null;
  let isSuspended = false;

  if (userId) {
    const userData = await ensureUserSynced(userId);
    userRole = userData?.role;
    userPlanName = userData?.plan?.name ?? null;
    isSuspended = userData?.suspended === true;

    try {
      const [taskHistory, personas] = await Promise.all([
        getRecentTasksByUserId(userId, 12),
        getEffectivePersonaConfig(),
      ]);

      history = taskHistory.map((task) => {
        const persona = getPersonaFromConfig({
          personas,
          personaId: task.personaId,
        });

        return {
          id: task._id,
          title: task.title,
          personaId: persona.id,
          personaLabel: persona.label,
          personaIcon: persona.icon,
          updatedAtLabel: mapDateToLabel(task.updatedAt),
          href: `/app/c/${task._id}`,
        };
      });
    } catch (error) {
      process.stderr.write(
        `[chat-sidebar] failed to build task history: ${error instanceof Error ? error.message : "unknown"}\n`,
      );
    }
  }

  return (
    <ChatSidebarShell
      historyItems={history}
      userRole={userRole}
      userPlanName={userPlanName}
      isSuspended={isSuspended}
    />
  );
}
