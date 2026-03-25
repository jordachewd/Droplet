import PageWrapper from "@/components/layout/page-wrapper";
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
    <PageWrapper className="justify-center items-center">
      {children}
    </PageWrapper>
  );
}
