import ChatSidebarShell from "@/components/chat/sidebar/chat-sidebar-shell";
import { auth } from "@clerk/nextjs/server";
import { getPersona } from "@/constants/assistant-personas";
import { getRecentTasksByUserId } from "@/lib/utils/task-queries";
import { mapDateToLabel } from "@/lib/utils/map-date-to-label";
import { ConversationListItem } from "@/types/PersonaData.d";

export default async function ChatSidebar() {
  const { userId } = await auth();
  let history: ConversationListItem[] = [];

  if (userId) {
    try {
      const taskHistory = await getRecentTasksByUserId(userId, 12);

      history = taskHistory.map((task) => {
        const persona = getPersona(task.personaId);

        return {
          id: task._id,
          title: task.title,
          personaId: persona.id,
          updatedAtLabel: mapDateToLabel(task.updatedAt),
          href: `/app/c/${task._id}`,
        };
      });
    } catch {}
  }

  return <ChatSidebarShell historyItems={history} />;
}
