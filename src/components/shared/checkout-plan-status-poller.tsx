"use client";

import { useEffect, useState } from "react";

interface CheckoutPlanStatusPollerProps {
  sessionId: string;
}

type CheckoutPlanPollState = "checking" | "confirmed" | "timed_out";

const POLL_INTERVAL_MS = 4_000;
const MAX_POLL_DURATION_MS = 30_000;
const REQUEST_TIMEOUT_MS = 2_500;

async function fetchCheckoutPlanConfirmation(
  sessionId: string,
): Promise<boolean> {
  const controller = new AbortController();
  const requestTimeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `/api/checkout/plan-status?session_id=${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { confirmed?: boolean };
    return payload.confirmed === true;
  } catch {
    return false;
  } finally {
    clearTimeout(requestTimeout);
  }
}

export default function CheckoutPlanStatusPoller({
  sessionId,
}: CheckoutPlanStatusPollerProps) {
  const [pollState, setPollState] = useState<CheckoutPlanPollState>("checking");

  useEffect(() => {
    let isMounted = true;
    let nextPollTimeout: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const pollCheckoutPlanStatus = async () => {
      if (!isMounted) {
        return;
      }

      if (Date.now() - startedAt >= MAX_POLL_DURATION_MS) {
        setPollState((currentState) =>
          currentState === "confirmed" ? currentState : "timed_out",
        );
        return;
      }

      const confirmed = await fetchCheckoutPlanConfirmation(sessionId);

      if (!isMounted) {
        return;
      }

      if (confirmed) {
        setPollState("confirmed");
        return;
      }

      nextPollTimeout = setTimeout(() => {
        void pollCheckoutPlanStatus();
      }, POLL_INTERVAL_MS);
    };

    const maxDurationTimeout = setTimeout(() => {
      if (!isMounted) {
        return;
      }

      setPollState((currentState) =>
        currentState === "confirmed" ? currentState : "timed_out",
      );

      if (nextPollTimeout) {
        clearTimeout(nextPollTimeout);
      }
    }, MAX_POLL_DURATION_MS);

    void pollCheckoutPlanStatus();

    return () => {
      isMounted = false;
      if (nextPollTimeout) {
        clearTimeout(nextPollTimeout);
      }
      if (maxDurationTimeout) {
        clearTimeout(maxDurationTimeout);
      }
    };
  }, [sessionId]);

  if (pollState === "confirmed") {
    return (
      <p className="CheckoutPlanStatusPoller body-2 text-sm sm:text-base text-emerald-700 inline-flex items-center justify-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
        Plan upgraded successfully!
      </p>
    );
  }

  if (pollState === "timed_out") {
    return (
      <p className="CheckoutPlanStatusPoller body-2 text-sm sm:text-base text-midnightBlue-900">
        Payment successful. Your plan will be updated shortly.
      </p>
    );
  }

  return (
    <p className="CheckoutPlanStatusPoller body-2 text-sm sm:text-base text-midnightBlue-900">
      Confirming your plan upgrade...
    </p>
  );
}
