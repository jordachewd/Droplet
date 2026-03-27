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
    "droplet-scrollbar relative z-10 flex h-dvh w-full flex-col p-0 m-0 overflow-y-auto",
    customCss,
  );

  const scrollWrapperClass = classNames(
    "relative z-10 flex h-full w-full pb-10 flex-1 flex-col gap-16",
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
