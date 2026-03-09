import classNames from "classnames";
import { ReactNode } from "react";

interface MainWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function MainWrapper({
  children,
  className: styles = "",
}: MainWrapperProps) {
  const overlayClass = classNames(
    "absolute inset-0 z-1 flex h-full w-full bg-size-[16px_16px]",
    "bg-[radial-gradient(#4A4A4A10_1px,transparent_1px)]",
    "[-webkit-mask-image:radial-gradient(ellipse_100%_90%_at_50%_0%,#000000_40%,transparent_100%)]",
    "mask-[radial-gradient(ellipse_100%_90%_at_50%_0%,#000000_40%,transparent_100%)]",
    "bg-lightPrimary-500/50",
    "dark:bg-[radial-gradient(#EAEAEA10_1px,transparent_1px)]",
    "dark:bg-darkPrimary-500/50",
  );

  return (
    <main
      className={classNames(
        "MainWrapper relative z-0 flex w-full flex-col pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]",
        styles,
      )}
    >
      {children}
      <div className={overlayClass} />
    </main>
  );
}
