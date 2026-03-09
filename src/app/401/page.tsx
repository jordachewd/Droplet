import HttpStatusPage from "@/components/shared/http-status-page";

export default function UnauthorizedPage() {
  return (
    <HttpStatusPage
      code={401}
      title="Unauthorized"
      message="Authentication is required before accessing this resource."
      details="Please sign in and try again."
      ctaHref="/sign-in"
      ctaLabel="Go to Sign In"
    />
  );
}
