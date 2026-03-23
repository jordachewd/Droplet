import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="PublicLayout relative flex min-h-dvh flex-col">
      <a href="#public-main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      
      <main id="public-main-content" className="flex flex-col w-full">
        {children}
      </main>

      <Footer />
    </div>
  );
}
