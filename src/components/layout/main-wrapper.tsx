import classNames from "classnames";
import { ReactNode } from "react";

interface MainWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function MainWrapper({ children }: MainWrapperProps) {
  const mainWrapperStyles = classNames(
    "MainWrapper relative z-0 flex w-full flex-col pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]",
  );

  return <main className={mainWrapperStyles}>{children}</main>;
}
