import HttpStatusPage from "@/components/shared/http-status-page";

export default function NotFoundPage() {
  return (
    <HttpStatusPage
      code={404}
      title="Page Not Found"
      message="The page you requested could not be found."
      details="Please check the URL or return to the homepage."
      ctaHref="/"
      ctaLabel="Go Home"
    />
  );
}
