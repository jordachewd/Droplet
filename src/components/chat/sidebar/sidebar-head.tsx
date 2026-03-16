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
      <Logo className={isDesktopCollapsed ? "lg:hidden" : ""} />
      {isDesktopCollapsed && <Logo className="hidden lg:flex" size={26} />}
    </div>
  );
}
