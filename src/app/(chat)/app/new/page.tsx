import { PERSONAS } from "@/constants/assistant-personas";
import PageHead from "@/components/layout/page-head";
import PageWrapper from "@/components/layout/page-wrapper";
import PersonaCard from "@/components/shared/persona-card";

export default function NewConversationPage() {
  return (
    <PageWrapper id="NewConversationPage" scrollable>
      <section className="NewConversationPage mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
        <PageHead
          title="Start a New Conversation"
          subtitle="Pick an AI persona and jump directly into the chat dashboard."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PERSONAS.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              href={`/app?persona=${persona.id}`}
            />
          ))}
        </div>
      </section>
    </PageWrapper>
  );
}
