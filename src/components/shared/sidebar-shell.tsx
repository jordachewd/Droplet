"use client";

import { ReactNode, useEffect } from "react";
import classNames from "classnames";
import { usePathname } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { useUiStore } from "@/lib/hooks/use-ui-store";

export type SidebarShellExpandedWidth = "lg:w-56" | "lg:w-72";

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
  expandedWidth: SidebarShellExpandedWidth;
  header: SidebarShellSlot;
  navigation: SidebarShellSlot;
  footer?: SidebarShellSlot;
  className?: string;
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

export default function SidebarShell({
  id,
  expandedWidth,
  header,
  navigation,
  footer,
  className,
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

  const sidebarClass = classNames(
    "SidebarShell app-sidebar justify-between transition-all duration-300 lg:translate-x-0",
    mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
    isDesktopCollapsed ? "lg:w-16" : expandedWidth,
    className,
  );
  const backdropClass = classNames(
    "sidebar-backdrop",
    !mobileSidebarOpen && "hidden",
  );

  function handleCloseMobileSidebar() {
    setMobileSidebarOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={backdropClass}
        onClick={handleCloseMobileSidebar}
        aria-label="Close sidebar overlay"
      />

      <aside className={sidebarClass} id={id}>
        {renderSlot(header, slotState)}
        {renderSlot(navigation, slotState)}
        {renderSlot(footer, slotState)}
      </aside>
    </>
  );
}
