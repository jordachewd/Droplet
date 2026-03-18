"use client";

import Logo from "@/components/shared/app-logo";

interface SidebarHeadProps {
  isDesktopCollapsed?: boolean;
}

export default function SidebarHead({
  isDesktopCollapsed = false,
}: SidebarHeadProps) {
  return (
    <div className="ChatSidebarHead flex w-full items-center gap-2 bg-lavenderHaze-100 p-3 dark:bg-nightIndigo-1000 border-b border-slate-300/70 dark:border-slate-500">
      <Logo size={36} iconOnly={isDesktopCollapsed} />
    </div>
  );
}
