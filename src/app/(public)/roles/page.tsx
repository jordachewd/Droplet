import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import RolesSection from "@/components/sections/roles-section";

export default function RolesPage() {
  return (
    <>
      <Header />
      <section className="mx-auto mt-14 flex w-full max-w-7xl flex-1">
        <RolesSection />
      </section>
      <Footer />
    </>
  );
}
