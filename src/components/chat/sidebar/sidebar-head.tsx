"use client";

import Logo from "@/components/shared/app-logo";

interface SidebarHeadProps {
  isDesktopCollapsed?: boolean;
}

export default function SidebarHead({
  isDesktopCollapsed = false,
}: SidebarHeadProps) {
  return (
    <div className="ChatSidebarHead flex w-full items-center gap-2 bg-lightPrimary-100 p-3 dark:bg-darkPrimary-1000">
      <Logo size={40} iconOnly={isDesktopCollapsed} />
    </div>
  );
}
