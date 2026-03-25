import classNames from "classnames";
import { ReactNode } from "react";

interface PageWrapperProps {
  id?: string;
  scrollable?: boolean;
  className?: string;
  children: ReactNode;
}

export default function ChatPageWrapper({
  children,
  scrollable = false,
  className: customCss = "",
  id: pageId = "ChatPageWrapper",
}: PageWrapperProps) {
  const pageClass = classNames(
    pageId,
    "relative z-10 flex h-dvh w-full flex-col p-0 m-0",
    customCss,
  );

  const scrollWrapperClass = classNames(
    "droplet-scrollbar relative z-10 flex h-full w-full",
    "overflow-y-auto pb-10 flex-1 flex-col gap-16 mt-14",
  );

  return (
    <section className={pageClass} id={pageId}>
      {scrollable ? (
        <div className={scrollWrapperClass}>{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
