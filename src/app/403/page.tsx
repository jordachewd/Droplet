import HttpStatusPage from "@/components/shared/http-status-page";

export default function ForbiddenPage() {
  return (
    <HttpStatusPage
      code={403}
      title="Forbidden"
      message="You do not have permission to access this page."
      details="Contact your administrator if you believe this should be available to your account."
      ctaHref="/"
      ctaLabel="Go Home"
    />
  );
}
