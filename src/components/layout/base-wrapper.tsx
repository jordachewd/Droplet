import { ReactNode } from "react";

interface MainWrapperProps {
  children: ReactNode;
}

export default function BaseWrapper({ children }: MainWrapperProps) {
  return <div className="app-base-wrapper">{children}</div>;
}
