import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import Plans from "@/components/sections/plans-section";
import Faqs from "@/components/sections/faqs-section";

export default function PricingPage() {
  return (
    <>
      <Header />
      <section className="mx-auto mt-14 flex w-full max-w-7xl flex-1 flex-col gap-10 pb-10">
        <Plans />
        <Faqs />
      </section>
      <Footer />
    </>
  );
}
