import PageHead from "@/components/layout/PageHead";
import PublicSection from "@/components/public/PublicSection";
import CheckoutPlanStatusPoller from "@/components/shared/checkout-plan-status-poller";
import { requireEnv } from "@/lib/utils/require-env";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import Stripe from "stripe";

type CheckoutSearchParams = {
  session_id?: string | string[];
};

interface CheckoutSuccessPageProps {
  searchParams: Promise<CheckoutSearchParams>;
}

function resolveSessionId(rawSessionId?: string | string[]): string | null {
  if (typeof rawSessionId !== "string") {
    return null;
  }

  const normalizedSessionId = rawSessionId.trim();

  if (!normalizedSessionId || normalizedSessionId.length > 255) {
    return null;
  }

  return normalizedSessionId;
}

async function isPaidCheckoutSession(sessionId: string): Promise<boolean> {
  try {
    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session.payment_status === "paid";
  } catch (error) {
    process.stderr.write(
      `[checkout-success] Failed to verify Stripe checkout session: ${error instanceof Error ? error.message : "unknown"}.\n`,
    );

    return false;
  }
}

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const suffix = "checkout-success";
  const resolvedSearchParams = await searchParams;
  const sessionId = resolveSessionId(resolvedSearchParams.session_id);
  const paymentVerified = sessionId
    ? await isPaidCheckoutSession(sessionId)
    : false;

  const title = paymentVerified
    ? "Payment successful"
    : "Payment confirmation unavailable";

  const message = !sessionId
    ? "We could not verify your checkout session. Please return to plans and try again."
    : !paymentVerified
      ? "We could not verify your payment. Please return to plans and try again."
      : null;

  const linkHref = paymentVerified ? "/app/profile" : "/app/plans";
  const linkLabel = paymentVerified ? "Go to profile" : "Back to plans";

  return (
    <>
      <PageHead id={`${suffix}-page-head`} title={title} align="center" />

      <PublicSection
        id={`${suffix}-section`}
        sectionClass={`${suffix}-section`}
        wrapperClass={`${suffix}-wrapper`}
      >
        <div className="flex flex-col items-center text-center min-h-[55vh] w-full gap-8">
          {paymentVerified && sessionId ? (
            <CheckoutPlanStatusPoller sessionId={sessionId} />
          ) : (
            <p className="body-2 text-sm sm:text-base">{message}</p>
          )}
          <Link
            className="btn btn-sm btn-outlined self-center mt-6"
            href={linkHref}
          >
            {linkLabel}
          </Link>
        </div>
      </PublicSection>
    </>
  );
}
