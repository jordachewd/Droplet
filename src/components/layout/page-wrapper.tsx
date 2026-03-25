import { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export default function PageWrapper({
  children,
  className = "",
  id: pageId = "PublicPageWrapper",
}: PageWrapperProps) {
  return (
    <div
      id={pageId}
      className={`${pageId} flex w-full mx-auto max-w-screen-2xl flex-col gap-16 px-4 py-24 ${className}`}
    >
      {children}
    </div>
  );
}
