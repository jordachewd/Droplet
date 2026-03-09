import { ASSISTANT_ROLES } from "@/constants/assistant-roles";
import AssistantRoleCard from "@/components/shared/assistant-role-card";
import PageHead from "@/components/layout/page-head";
import PageWrapper from "@/components/layout/page-wrapper";

export default function NewConversationPage() {
  return (
    <PageWrapper id="NewConversationPage" scrollable>
      <section className="NewConversationPage mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
        <PageHead
          title="Start a New Conversation"
          subtitle="Pick a demo AI role and jump directly into the chat dashboard."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ASSISTANT_ROLES.map((role) => (
            <AssistantRoleCard
              key={role.id}
              role={role}
              href={`/app?role=${role.id}`}
            />
          ))}
        </div>
      </section>
    </PageWrapper>
  );
}
