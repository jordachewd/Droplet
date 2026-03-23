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
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    process.stderr.write(
      "[checkout-success] Missing Stripe secret while verifying checkout session.\n",
    );

    return false;
  }

  const stripe = new Stripe(stripeSecret);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session.payment_status === "paid";
  } catch {
    process.stderr.write(
      "[checkout-success] Failed to verify Stripe checkout session.\n",
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

  const resolvedSearchParams = await searchParams;
  const sessionId = resolveSessionId(resolvedSearchParams.session_id);

  if (!sessionId) {
    return (
      <section className="CheckoutSuccessPage mx-auto flex w-full max-w-screen-2xl flex-1 flex-col items-center justify-center px-4 py-20 sm:px-6">
        <div className="w-full rounded-4xl border border-slate-400/80 bg-lavenderHaze-100/85 p-8 text-center shadow-sm dark:border-slate-500 dark:bg-nightIndigo-900/85">
          <h1 className="heading-3">Payment confirmation unavailable</h1>
          <p className="body-2 mt-4 text-sm sm:text-base">
            We could not verify your checkout session. Please return to plans
            and try again.
          </p>
          <Link
            className="btn btn-contained mt-7 inline-flex uppercase"
            href="/app/plans"
          >
            Back to plans
          </Link>
        </div>
      </section>
    );
  }

  const paymentVerified = await isPaidCheckoutSession(sessionId);

  if (paymentVerified) {
    return (
      <section className="CheckoutSuccessPage mx-auto flex w-full max-w-screen-2xl flex-1 flex-col items-center justify-center px-4 py-20 sm:px-6">
        <div className="w-full rounded-4xl border border-slate-400/80 bg-lavenderHaze-100/85 p-8 text-center shadow-sm dark:border-slate-500 dark:bg-nightIndigo-900/85">
          <h1 className="heading-3">Payment successful</h1>
          <p className="body-2 mt-4 text-sm sm:text-base">
            Your payment was confirmed. You can now continue in your profile.
          </p>
          <Link
            className="btn btn-contained mt-7 inline-flex uppercase"
            href="/app/profile"
          >
            Go to profile
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="CheckoutSuccessPage mx-auto flex w-full max-w-screen-2xl flex-1 flex-col items-center justify-center px-4 py-20 sm:px-6">
      <div className="w-full rounded-4xl border border-slate-400/80 bg-lavenderHaze-100/85 p-8 text-center shadow-sm dark:border-slate-500 dark:bg-nightIndigo-900/85">
        <h1 className="heading-3">Payment confirmation unavailable</h1>
        <p className="body-2 mt-4 text-sm sm:text-base">
          We could not verify your payment. Please return to plans and try
          again.
        </p>
        <Link
          className="btn btn-contained mt-7 inline-flex uppercase"
          href="/app/plans"
        >
          Back to plans
        </Link>
      </div>
    </section>
  );
}
