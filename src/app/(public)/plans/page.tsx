import Plans from "@/components/sections/plans-section";
import Faqs from "@/components/sections/faqs-section";

export default function PlansPage() {
  return (
    <section className="PlansPage mx-auto mt-14 flex w-full max-w-screen-2xl flex-1 flex-col gap-10 pb-10">
      <Plans />
      <Faqs />
    </section>
  );
}
