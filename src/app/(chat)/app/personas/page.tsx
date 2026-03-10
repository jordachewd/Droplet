import PageWrapper from "@/components/layout/page-wrapper";
import PersonasSection from "@/components/sections/personas-section";

export default function AppPersonasPage() {
  return (
    <PageWrapper id="AppPersonasPage" scrollable>
      <PersonasSection isAppMode />
    </PageWrapper>
  );
}
