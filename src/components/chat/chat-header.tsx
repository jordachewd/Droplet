"use client";

import { useRef, useSyncExternalStore } from "react";
import classNames from "classnames";
import { usePathname } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import ToggleTheme from "@/components/shared/toggle-theme";
import AvatarMenu from "@/components/shared/avatar-menu";
import SidebarToggle from "@/components/shared/sidebar-toggle";
import { useChatStore } from "@/lib/hooks/use-chat-store";
import { useUiStore } from "@/lib/hooks/use-ui-store";
import { Persona, PersonaId } from "@/types/PersonaData.d";
import { usePreferencesStore } from "@/lib/hooks/use-preferences-store";

interface ChatHeaderProps {
  personas: Persona[];
  className?: string;
  allowedPersonaIds?: PersonaId[];
}

export default function ChatHeader({
  personas,
  className: style = "",
  allowedPersonaIds,
}: ChatHeaderProps) {
  const pathname = usePathname();
  const { messages, taskStatus, personaId, setPersonaId } = useChatStore(
    useShallow((state) => ({
      messages: state.messages,
      taskStatus: state.taskStatus,
      personaId: state.personaId,
      setPersonaId: state.setPersonaId,
    })),
  );
  const { preferredPersonaId, setPreferredPersonaId } = usePreferencesStore(
    useShallow((state) => ({
      preferredPersonaId: state.preferredPersonaId,
      setPreferredPersonaId: state.setPreferredPersonaId,
    })),
  );

  const {
    desktopSidebarCollapsed,
    mobileSidebarOpen,
    toggleDesktopSidebarCollapsed,
    toggleMobileSidebarOpen,
  } = useUiStore(
    useShallow((state) => ({
      desktopSidebarCollapsed: state.desktopSidebarCollapsed,
      mobileSidebarOpen: state.mobileSidebarOpen,
      toggleDesktopSidebarCollapsed: state.toggleDesktopSidebarCollapsed,
      toggleMobileSidebarOpen: state.toggleMobileSidebarOpen,
    })),
  );

  const desktopQueryRef = useRef<MediaQueryList | null>(null);
  const isDesktop = useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia("(min-width: 1024px)");
      desktopQueryRef.current = mql;
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );

  function handleToggleSidebar() {
    if (desktopQueryRef.current?.matches) {
      toggleDesktopSidebarCollapsed();
    } else {
      toggleMobileSidebarOpen();
    }
  }

  const selectablePersonaIds =
    allowedPersonaIds === undefined
      ? (personas.map((persona) => persona.id) as PersonaId[])
      : allowedPersonaIds;
  const selectablePersonas = personas.filter((persona) =>
    selectablePersonaIds.includes(persona.id),
  );
  const activePersonaId = (personaId ??
    preferredPersonaId ??
    selectablePersonas[0]?.id) as PersonaId | null;
  const isConversationRoute = pathname?.startsWith("/app/c/") ?? false;
  const messageCount = messages.length;
  const shouldDisablePersonaChange =
    isConversationRoute || messageCount > 0 || taskStatus === "ended";
  const sidebarExpanded = isDesktop
    ? !desktopSidebarCollapsed
    : mobileSidebarOpen;

  function handlePersonaChange(nextPersonaId: string) {
    if (!selectablePersonaIds.includes(nextPersonaId as PersonaId)) {
      return;
    }

    const nextId = nextPersonaId as PersonaId;
    setPersonaId(nextId);
    setPreferredPersonaId(nextId);
  }

  const chatHeaderClass = classNames(
    "ChatHeader absolute left-0 right-0 top-0 z-20 flex w-full px-4",
    style,
  );

  return (
    <section className={chatHeaderClass}>
      <div className="mx-auto flex w-full items-center justify-between gap-4 py-2.5">
        <div className="flex items-center gap-2">
          <SidebarToggle
            icon="bi-layout-sidebar"
            title={sidebarExpanded ? "Hide menu" : "Show menu"}
            toggleSidebar={handleToggleSidebar}
            expanded={sidebarExpanded}
            controlsId="chat-sidebar"
          />

          {selectablePersonas.length > 0 && activePersonaId && (
            <div className="flex items-center gap-2 rounded-full border border-dotted px-2.5 py-1 text-xs">
              <select
                aria-label="Select persona"
                className={classNames(
                  "rounded bg-transparent pr-1 text-xs font-semibold outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-80",
                )}
                value={activePersonaId}
                onChange={(event) => handlePersonaChange(event.target.value)}
                disabled={shouldDisablePersonaChange}
              >
                {selectablePersonas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.label}
                  </option>
                ))}
              </select>
              <span className="text-midnightBlue-700 dark:text-lavenderHaze-700">
                Persona
              </span>
            </div>
          )}

          {messageCount > 0 && (
            <div className="hidden rounded-full border border-dotted px-2.5 py-1 text-xs opacity-80 md:flex">
              {messageCount} messages
            </div>
          )}

          {taskStatus === "ended" && (
            <div className="flex rounded-full border border-amber-500/60 bg-amber-100/80 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100">
              Conversation ended
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ToggleTheme />
          <AvatarMenu />
        </div>
      </div>
    </section>
  );
}
