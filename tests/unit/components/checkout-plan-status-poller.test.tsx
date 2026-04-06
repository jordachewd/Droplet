/** @vitest-environment jsdom */

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutPlanStatusPoller from "@/components/shared/checkout-plan-status-poller";

const fetchMock = vi.fn();

function createJsonResponse(payload: object, status: number = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("CheckoutPlanStatusPoller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows confirmation-in-progress message initially", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));

    render(<CheckoutPlanStatusPoller sessionId="cs_test_123" />);

    expect(screen.getByText("Confirming your plan upgrade...")).toBeTruthy();
  });

  it("shows success state when plan status confirms", async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ confirmed: true }));

    render(<CheckoutPlanStatusPoller sessionId="cs_test_123" />);

    await waitFor(() => {
      expect(screen.getByText("Plan upgraded successfully!")).toBeTruthy();
    });
  });

  it("shows timeout state after 30 seconds if confirmation does not arrive", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(createJsonResponse({ confirmed: false }));

    render(<CheckoutPlanStatusPoller sessionId="cs_test_123" />);

    expect(screen.getByText("Confirming your plan upgrade...")).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(30_001);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getByText(
        "Payment successful. Your plan will be updated shortly.",
      ),
    ).toBeTruthy();
  });
});
