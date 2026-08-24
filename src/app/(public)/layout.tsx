import { ReactNode } from "react";
import PublicFooter from "@/components/public/PublicFooter";
import PublicHeader from "@/components/public/PublicHeader";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({
  children,
}: Readonly<PublicLayoutProps>) {
  return (
    <>
      <a href="#public-main" className="skip-link">
        Skip to main content
      </a>

      <PublicHeader />

      <main id="public-main" className="public-main">
        {children}
      </main>

      <PublicFooter />
    </>
  );
}
