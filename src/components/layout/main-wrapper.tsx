import { ReactNode } from "react";

interface MainWrapperProps {
  children: ReactNode;
}

export default function MainWrapper({ children }: MainWrapperProps) {
  return (
    <div className="MainWrapper relative z-0 flex w-full flex-col pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {children}
    </div>
  );
}
