"use client";

import classNames from "classnames";
import { ASSISTANT_ROLES } from "@/constants/assistant-roles";
import { AssistantRoleId } from "@/types/AssistantRoleData.d";

interface ChatRolePickerProps {
  selectedRoleId: AssistantRoleId;
  onSelectRole: (roleId: AssistantRoleId) => void;
}

export default function ChatRolePicker({
  selectedRoleId,
  onSelectRole,
}: ChatRolePickerProps) {
  return (
    <section className="ChatRolePicker flex w-full flex-col gap-2">
      <p className="px-1 text-xxs font-semibold uppercase tracking-wide opacity-70">
        Assistant Studio
      </p>
      <div className="cellesseon-scrollbar flex w-full items-center gap-2 overflow-x-auto pb-1">
        {ASSISTANT_ROLES.map((role) => {
          const isActive = role.id === selectedRoleId;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelectRole(role.id)}
              className={classNames(
                "inline-flex min-w-max items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all",
                "border-lightBorders-500 bg-lightBackground-100 hover:bg-lightSecondary-200/90",
                "dark:border-darkBorders-500 dark:bg-jwdMarine-900 dark:hover:bg-darkSecondary-500/30",
                isActive &&
                  "border-jwdMarine-300 bg-lightPrimary-100 font-semibold dark:border-jwdAqua-500 dark:bg-darkPrimary-500/25",
              )}
              aria-pressed={isActive}
            >
              <i className={role.icon}></i>
              {role.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
