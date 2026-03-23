"use client";

import Logo from "@/components/shared/app-logo";

interface SidebarHeadProps {
  isDesktopCollapsed?: boolean;
}

export default function SidebarHead({
  isDesktopCollapsed = false,
}: SidebarHeadProps) {
  return (
    <div className="ChatSidebarHead flex w-full items-center gap-2 px-4 py-3">
      <Logo size={32} iconOnly={isDesktopCollapsed} />
    </div>
  );
}
