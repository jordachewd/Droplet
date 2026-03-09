import PageWrapper from "@/components/layout/page-wrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication",
  description: "Authentication pages for Cellesseon",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageWrapper className="justify-center items-center">
      {children}
    </PageWrapper>
  );
}
