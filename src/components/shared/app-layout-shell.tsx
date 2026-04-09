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

  const layoutClass = classNames(
    className,
    "relative z-10 flex h-dvh min-h-dvh w-full p-0 m-0",
  );

  return (
    <section className={layoutClass}>
      <a href={skipLinkHref} className="skip-link">
        Skip to main content
      </a>

      {sidebar}

      <div className="AppLayoutMainWrapper relative z-10 flex h-dvh w-full flex-1 flex-col p-0 m-0 overflow-y-auto">
        {header}

        <main
          id={mainId}
          tabIndex={-1}
          className="AppLayoutMain relative flex h-full min-w-0 flex-1 flex-col"
        >
          {children}
        </main>
      </div>
    </section>
  );
}
