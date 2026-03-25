import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Authentication",
  description: "Authentication pages for Droplet",
};

interface AuthLayoutProps {
  children: ReactNode;
}

export default async function Layout({ children }: AuthLayoutProps) {
  return (
    <div className="AuthLayoutWrapper flex h-dvh w-full justify-center items-center">
      {children}
    </div>
  );
}
