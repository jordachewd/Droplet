import { ReactNode } from "react";

interface AppBaseWrapperProps {
  children: ReactNode;
}

export default function AppBaseWrapper({ children }: AppBaseWrapperProps) {
  return <div className="app-base-wrapper">{children}</div>;
}
