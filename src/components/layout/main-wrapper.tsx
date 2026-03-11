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
  const mainWrapperStyles = classNames(
    "MainWrapper relative z-0 flex w-full flex-col pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]",
    styles,
  );

  return <main className={mainWrapperStyles}>{children}</main>;
}
