import Link from "next/link";
import classNames from "classnames";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getPersona } from "@/constants/assistant-personas";
import PageWrapper from "@/components/layout/page-wrapper";
import PageHead from "@/components/layout/page-head";
import { getRecentTasksByUserId } from "@/lib/utils/task-queries";
import { mapDateToLabel } from "@/lib/utils/map-date-to-label";
import { ConversationListItem } from "@/types/PersonaData.d";
import LibraryDeleteButton from "@/components/chat/library-delete-button";

export default async function LibraryPage() {
  const { userId } = await auth();
  let conversations: ConversationListItem[] = [];

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    const taskHistory = await getRecentTasksByUserId(userId, 20);

    conversations = taskHistory.map((task) => ({
      id: task._id,
      title: task.title,
      personaId: task.personaId,
      updatedAtLabel: mapDateToLabel(task.updatedAt),
      href: `/app/c/${task._id}`,
    }));
  } catch {}

  return (
    <PageWrapper id="LibraryPage" scrollable>
      <section className="LibraryPage mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
        <PageHead
          title="Conversation Library"
          subtitle="Saved sessions grouped by persona."
        />

        {conversations.length === 0 ? (
          <article
            className={classNames(
              "rounded-2xl border border-dashed p-8 text-center shadow-sm",
              "border-lightBorders-400 bg-white/70",
              "dark:border-darkBorders-500 dark:bg-jwdMarine-900/70",
            )}
          >
            <h2 className="heading-5">No saved conversations yet</h2>
            <p className="body-2 mt-3">
              Conversations appear here after you send prompts in the app.
            </p>
            <Link
              href="/app/new"
              className={classNames(
                "mt-5 inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                "border-lightBorders-400 bg-white/80 hover:-translate-y-0.5 hover:bg-lightSecondary-300/70",
                "dark:border-darkBorders-500 dark:bg-jwdMarine-900/80 dark:hover:bg-darkSecondary-500/30",
              )}
            >
              Start a conversation
            </Link>
          </article>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {conversations.map((conversation) => {
              const persona = getPersona(conversation.personaId);

              return (
                <article
                  key={conversation.id}
                  className={classNames(
                    "flex items-start gap-3 rounded-xl border p-4 transition-all duration-300",
                    "border-lightBorders-400 bg-white/70 shadow-sm",
                    "dark:border-darkBorders-500 dark:bg-jwdMarine-900/70",
                  )}
                >
                  <Link
                    href={conversation.href}
                    className={classNames(
                      "min-w-0 flex-1 rounded-lg transition-all duration-300",
                      "hover:-translate-y-0.5 hover:shadow-md",
                    )}
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <h2 className="heading-6 truncate text-lg">
                        {conversation.title}
                      </h2>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm opacity-80">
                      <span className="inline-flex items-center gap-2">
                        <i className={persona.icon}></i>
                        {persona.label}
                      </span>
                      <span className="shrink-0">
                        {conversation.updatedAtLabel}
                      </span>
                    </div>
                  </Link>

                  <LibraryDeleteButton
                    conversationId={conversation.id}
                    conversationTitle={conversation.title}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PageWrapper>
  );
}
