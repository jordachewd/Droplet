import { describe, expect, it } from "vitest";
import User from "@/lib/database/models/user.model";

const baseUserInput = {
  clerkId: "clerk_user_1",
  username: "adal",
  email: "adal@example.com",
};

type SchemaIndex = [
  Record<string, number>,
  { unique?: boolean; sparse?: boolean },
];

describe("User model", () => {
  it("defaults new users to a permanent Lite plan", () => {
    const user = new User(baseUserInput);

    expect(user.validateSync()).toBeUndefined();
    expect(user.plan.name).toBe("Lite");
    expect(user.plan.amount).toBe(0);
    expect(user.plan.billing).toBe("Monthly");
    expect(user.plan.expiresOn.toISOString()).toBe("9999-12-31T23:59:59.999Z");
    expect(user.subscriptionStatus).toBeNull();
  });

  it("requires clerkId", () => {
    const user = new User({ ...baseUserInput, clerkId: undefined });
    const error = user.validateSync();

    expect(error?.errors.clerkId).toBeTruthy();
  });

  it("requires username", () => {
    const user = new User({ ...baseUserInput, username: undefined });
    const error = user.validateSync();

    expect(error?.errors.username).toBeTruthy();
  });

  it("requires email", () => {
    const user = new User({ ...baseUserInput, email: undefined });
    const error = user.validateSync();

    expect(error?.errors.email).toBeTruthy();
  });

  it("rejects invalid role values", () => {
    const user = new User({ ...baseUserInput, role: "owner" });
    const error = user.validateSync();

    expect(error?.errors.role).toBeTruthy();
  });

  it("defines indexes for identity, subscription, and suspension fields", () => {
    const schemaIndexes = User.schema.indexes() as SchemaIndex[];

    expect(
      schemaIndexes.some(
        ([fields, options]) => fields.clerkId === 1 && options?.unique === true,
      ),
    ).toBe(true);
    expect(schemaIndexes.some(([fields]) => fields.email === 1)).toBe(true);
    expect(schemaIndexes.some(([fields]) => fields.suspended === 1)).toBe(true);
    expect(
      schemaIndexes.some(
        ([fields, options]) =>
          fields.stripeCustomerId === 1 &&
          options?.unique === true &&
          options?.sparse === true,
      ),
    ).toBe(true);
    expect(
      schemaIndexes.some(([fields]) => fields.stripeSubscriptionId === 1),
    ).toBe(true);
    expect(
      schemaIndexes.some(([fields]) => fields.subscriptionStatus === 1),
    ).toBe(true);
  });

  it("rejects invalid plan name transitions outside allowed enum", () => {
    const user = new User({
      ...baseUserInput,
      plan: {
        id: 99,
        name: "Enterprise",
        amount: 199,
        billing: "Monthly",
        startedOn: new Date("2026-01-01T00:00:00.000Z"),
        expiresOn: new Date("2026-02-01T00:00:00.000Z"),
      },
    });
    const error = user.validateSync();

    expect(error?.errors["plan.name"]).toBeTruthy();
  });
});
