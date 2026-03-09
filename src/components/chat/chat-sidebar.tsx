import ChatSidebarShell from "@/components/chat/sidebar/chat-sidebar-shell";
import { auth } from "@clerk/nextjs/server";
import {
  DEMO_CONVERSATIONS,
  getAssistantRole,
} from "@/constants/assistant-roles";
import { getRecentTasksByUserId } from "@/lib/utils/task-queries";
import { mapDateToLabel } from "@/lib/utils/map-date-to-label";
import { ConversationListItem } from "@/types/AssistantRoleData.d";

export default async function ChatSidebar() {
  const { userId } = await auth();
  let history: ConversationListItem[] = DEMO_CONVERSATIONS;

  if (userId) {
    try {
      const taskHistory = await getRecentTasksByUserId(userId, 12);

      if (taskHistory.length > 0) {
        history = taskHistory.map((task) => {
          const role = getAssistantRole(task.assistantRoleId);

          return {
            id: task._id,
            title: task.title,
            assistantRoleId: role.id,
            updatedAtLabel: mapDateToLabel(task.updatedAt),
            href: `/app/c/${task._id}`,
          };
        });
      }
    } catch (error) {
      console.error("Chat sidebar history load failed:", error);
    }
  }

  return (
    <ChatSidebarShell historyItems={history} hasAuthUser={Boolean(userId)} />
  );
}
