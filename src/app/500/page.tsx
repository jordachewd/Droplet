import HttpStatusPage from "@/components/shared/http-status-page";

export default function InternalServerErrorPage() {
  return (
    <HttpStatusPage
      code={500}
      title="Server Error"
      message="Something went wrong while processing your request."
      details="Please try again in a few moments. If the issue persists, contact support."
      ctaHref="/"
      ctaLabel="Go Home"
    />
  );
}
