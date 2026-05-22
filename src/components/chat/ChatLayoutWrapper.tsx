"use client";

import { ReactNode } from "react";

interface ChatLayoutProps {
  mainId: string;
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  skipLinkTarget?: string;
}

export default function ChatLayoutWrapper({
  mainId,
  sidebar,
  header,
  children,
  skipLinkTarget,
}: ChatLayoutProps) {
  const skipTarget = skipLinkTarget ?? mainId;
  const skipLinkHref = skipTarget.startsWith("#")
    ? skipTarget
    : `#${skipTarget}`;

  return (
    <div className="chat-wrapper">
      <a href={skipLinkHref} className="skip-link">
        Skip to main content
      </a>

      {sidebar}

      <main id={mainId} tabIndex={-1} className="chat-main">
        {header}

        <div className="chat-content">{children}</div>
      </main>
    </div>
  );
}
