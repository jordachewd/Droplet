"use client";

import classNames from "classnames";
import { ReactNode } from "react";

interface AppLayoutShellProps {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  mainId: string;
  skipLinkTarget?: string;
  className?: string;
}

export default function AppLayoutShell({
  sidebar,
  header,
  children,
  mainId,
  skipLinkTarget,
  className,
}: AppLayoutShellProps) {
  const skipTarget = skipLinkTarget ?? mainId;
  const skipLinkHref = skipTarget.startsWith("#")
    ? skipTarget
    : `#${skipTarget}`;

  return (
    <div className={classNames("app-layout-shell", className)}>
      <a href={skipLinkHref} className="skip-link">
        Skip to main content
      </a>

      {sidebar}

      <div className="app-main">
        {header}

        <div id={mainId} tabIndex={-1} className="app-content">
          {children}
        </div>
      </div>
    </div>
  );
}
