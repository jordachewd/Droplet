import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const guestFile = path.join(__dirname, ".clerk/guest.json");

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/plans",
  "/personas",
  "/privacy",
  "/cookies",
  "/terms",
] as const;

const KNOWN_PUBLIC_VIOLATION_IDS: Record<
  (typeof PUBLIC_ROUTES)[number],
  string[]
> = PUBLIC_ROUTES.reduce(
  (accumulator, route) => {
    accumulator[route] = [];
    return accumulator;
  },
  {} as Record<(typeof PUBLIC_ROUTES)[number], string[]>,
);

function formatViolationsForError(
  route: string,
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
): string {
  const details = violations
    .map((violation) => {
      const targets = violation.nodes
        .flatMap((node) => node.target)
        .join(" | ");

      return `${violation.id}: ${violation.help} [impact=${violation.impact ?? "unknown"}] targets=${targets}`;
    })
    .join("\n");

  return `Accessibility violations found for route ${route}:\n${details}`;
}

test.use({ storageState: guestFile });

for (const route of PUBLIC_ROUTES) {
  test(`public route ${route} has no unexpected accessibility violations`, async ({
    page,
  }) => {
    const response = await page.goto(route);
    expect(response).not.toBeNull();
    await expect(page.getByRole("heading").first()).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const knownIds = new Set(KNOWN_PUBLIC_VIOLATION_IDS[route] ?? []);
    const unexpectedViolations = results.violations.filter(
      (violation) => !knownIds.has(violation.id),
    );

    if (knownIds.size > 0) {
      test.info().annotations.push({
        type: "known-a11y-violations",
        description: `${route}: ${Array.from(knownIds).join(", ")}`,
      });
    }

    expect(
      unexpectedViolations,
      formatViolationsForError(route, unexpectedViolations),
    ).toEqual([]);
  });
}
