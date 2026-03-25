import { ReactNode } from "react";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";

export default function PublicLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <a href="#public-main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />

      <main id="public-main-content" className="PublicMain flex flex-col w-full">
        {children}
      </main>

      <Footer />
    </>
  );
}
