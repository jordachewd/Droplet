import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import LandingPage from "@/components/sections/landing-page";

export default async function HomePage() {
  return (
    <>
      <Header />
      <LandingPage />
      <Footer />
    </>
  );
}
