import PageWrapper from "@/components/layout/page-wrapper";
import RolesSection from "@/components/sections/roles-section";

export default function AppRolesPage() {
  return (
    <PageWrapper id="AppRolesPage" scrollable>
      <RolesSection isAppMode />
    </PageWrapper>
  );
}
