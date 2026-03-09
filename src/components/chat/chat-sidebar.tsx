import ChatSidebarShell from "@/components/chat/sidebar/chat-sidebar-shell";
import { auth } from "@clerk/nextjs/server";
import {
  DEMO_CONVERSATIONS,
  getAssistantRole,
} from "@/constants/assistant-roles";
import { getRecentTasksByUserId } from "@/lib/utils/task-queries";
import { ConversationListItem } from "@/types/AssistantRoleData.d";

function mapDateToLabel(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} h ago`;
  }

  return `${Math.floor(diffHours / 24)} d ago`;
}

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
