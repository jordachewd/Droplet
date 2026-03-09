import Link from "next/link";
import classNames from "classnames";
import { auth } from "@clerk/nextjs/server";
import {
  DEMO_CONVERSATIONS,
  getAssistantRole,
} from "@/constants/assistant-roles";
import PageWrapper from "@/components/layout/page-wrapper";
import PageHead from "@/components/layout/page-head";
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

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d ago`;
}

export default async function LibraryPage() {
  const { userId } = await auth();
  let conversations: ConversationListItem[] = DEMO_CONVERSATIONS;

  if (userId) {
    try {
      const taskHistory = await getRecentTasksByUserId(userId, 20);

      if (taskHistory.length > 0) {
        conversations = taskHistory.map((task) => ({
          id: task._id,
          title: task.title,
          assistantRoleId: task.assistantRoleId,
          updatedAtLabel: mapDateToLabel(task.updatedAt),
          href: `/app/c/${task._id}`,
        }));
      }
    } catch (error) {
      console.error("Library conversations load failed:", error);
    }
  }

  return (
    <PageWrapper id="LibraryPage" scrollable>
      <section className="LibraryPage mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
        <PageHead
          title="Conversation Library"
          subtitle="Recent sessions grouped by role. Demo items are shown when no saved conversations exist yet."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {conversations.map((conversation) => {
            const role = getAssistantRole(conversation.assistantRoleId);

            return (
              <Link
                key={conversation.id}
                href={conversation.href}
                className={classNames(
                  "rounded-xl border p-4 transition-all duration-300",
                  "border-lightBorders-400 bg-white/70 shadow-sm hover:-translate-y-0.5 hover:shadow-md",
                  "dark:border-darkBorders-500 dark:bg-jwdMarine-900/70",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="heading-6 truncate text-lg">
                    {conversation.title}
                  </h2>
                  {conversation.isDemo && (
                    <span className="rounded-full border border-dotted px-2 py-1 text-xxs uppercase">
                      Demo
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm opacity-80">
                  <span className="inline-flex items-center gap-2">
                    <i className={role.icon}></i>
                    {role.label}
                  </span>
                  <span>{conversation.updatedAtLabel}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </PageWrapper>
  );
}
