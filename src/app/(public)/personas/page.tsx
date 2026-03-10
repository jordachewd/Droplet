import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import PersonasSection from "@/components/sections/personas-section";

export default function PersonasPage() {
  return (
    <>
      <Header />
      <section className="mx-auto mt-14 flex w-full max-w-7xl flex-1">
        <PersonasSection />
      </section>
      <Footer />
    </>
  );
}
