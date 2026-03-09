import { ASSISTANT_ROLES } from "@/constants/assistant-roles";
import AssistantRoleCard from "@/components/shared/assistant-role-card";
import PageHead from "@/components/layout/page-head";

interface RolesSectionProps {
  isAppMode?: boolean;
}

export default function RolesSection({ isAppMode = false }: RolesSectionProps) {
  return (
    <section className="RolesSection mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
      <PageHead
        title={isAppMode ? "Assistant Roles" : "Choose Your AI Role"}
        subtitle="Demo role catalog. Replace prompts and tone rules with your final production roles later."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ASSISTANT_ROLES.map((role) => (
          <AssistantRoleCard
            key={role.id}
            role={role}
            href={isAppMode ? `/app?role=${role.id}` : `/sign-up`}
          />
        ))}
      </div>
    </section>
  );
}
