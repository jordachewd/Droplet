import classNames from "classnames";
import { ReactNode } from "react";

interface PageWrapperProps {
  id?: string;
  scrollable?: boolean;
  className?: string;
  children: ReactNode;
}

export default function PageWrapper({
  children,
  scrollable = false,
  className: customCss = "",
  id: pageId = "PageWrapper",
}: PageWrapperProps) {
  const pageClass = classNames(
    "PageWrapper relative z-10 flex h-dvh w-full flex-col p-0 m-0",
    customCss,
  );

  const scrollWrapperClass = classNames(
    "droplet-scrollbar relative z-10 mt-14 flex h-full w-full flex-1 flex-col gap-10",
    "overflow-y-auto pb-10",
  );

  return (
    <div className={pageClass} id={pageId}>
      {scrollable ? (
        <div className={scrollWrapperClass}>{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
