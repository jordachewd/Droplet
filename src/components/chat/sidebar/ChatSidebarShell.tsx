"use client";

import { ReactNode, useEffect } from "react";
import classNames from "classnames";
import { usePathname } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { useUiStore } from "@/lib/hooks/use-ui-store";

export interface SidebarShellRenderState {
  isSidebarOpen: boolean;
  isDesktopCollapsed: boolean;
  isDesktopViewport: boolean;
}

type SidebarShellSlot =
  | ReactNode
  | ((state: SidebarShellRenderState) => ReactNode);

interface SidebarShellProps {
  id: string;
  header: SidebarShellSlot;
  navigation: SidebarShellSlot;
  footer?: SidebarShellSlot;
}

function renderSlot(
  slot: SidebarShellSlot | undefined,
  state: SidebarShellRenderState,
): ReactNode {
  if (typeof slot === "function") {
    return slot(state);
  }

  return slot ?? null;
}

export default function ChatSidebarShell({
  id,
  header,
  navigation,
  footer,
}: SidebarShellProps) {
  const pathname = usePathname();
  const isDesktopViewport = useIsDesktop();
  const {
    desktopSidebarCollapsed: isDesktopCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useUiStore(
    useShallow((state) => ({
      desktopSidebarCollapsed: state.desktopSidebarCollapsed,
      mobileSidebarOpen: state.mobileSidebarOpen,
      setMobileSidebarOpen: state.setMobileSidebarOpen,
    })),
  );

  useEffect(() => {
    if (isDesktopViewport) {
      setMobileSidebarOpen(false);
    }
  }, [isDesktopViewport, setMobileSidebarOpen]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  const isSidebarOpen = isDesktopViewport
    ? !isDesktopCollapsed
    : mobileSidebarOpen;

  const slotState: SidebarShellRenderState = {
    isSidebarOpen,
    isDesktopCollapsed,
    isDesktopViewport,
  };

  function handleCloseMobileSidebar() {
    setMobileSidebarOpen(false);
  }

  const backdropClass = classNames(
    "chat-sidebar-backdrop",
    !mobileSidebarOpen && "hidden",
  );

  const sidebarClass = classNames(
    "chat-sidebar lg:translate-x-0",
    mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
    isDesktopCollapsed ? "lg:w-16" : "lg:w-56",
  );

  return (
    <>
      <button
        type="button"
        className={backdropClass}
        onClick={handleCloseMobileSidebar}
        aria-label="Close sidebar overlay"
      />

      <aside id={id} className={sidebarClass}>
        {renderSlot(header, slotState)}
        {renderSlot(navigation, slotState)}
        {renderSlot(footer, slotState)}
      </aside>
    </>
  );
}
