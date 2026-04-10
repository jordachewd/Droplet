import { describe, expect, it } from "vitest";
import Transaction from "@/lib/database/models/transaction.model";

type SchemaIndex = [
  Record<string, number>,
  { unique?: boolean; sparse?: boolean },
];

const baseTransactionInput = {
  stripeId: "cs_test_123",
  userId: "507f1f77bcf86cd799439011",
  clerkId: "clerk_user_1",
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  expiresOn: new Date("2026-05-01T00:00:00.000Z"),
  amount: 19,
  plan: "Pro",
  billing: "Monthly",
};

describe("Transaction model", () => {
  it("defaults transaction type to one_time", () => {
    const transaction = new Transaction(baseTransactionInput);

    expect(transaction.validateSync()).toBeUndefined();
    expect(transaction.type).toBe("one_time");
  });

  it("rejects invalid transaction type", () => {
    const transaction = new Transaction({
      ...baseTransactionInput,
      type: "legacy",
    });
    const error = transaction.validateSync();

    expect(error?.errors.type).toBeTruthy();
  });

  it("defines indexes for stripe invoice and transaction type", () => {
    const schemaIndexes = Transaction.schema.indexes() as SchemaIndex[];

    expect(
      schemaIndexes.some(
        ([fields, options]) =>
          fields.stripeInvoiceId === 1 &&
          options?.unique === true &&
          options?.sparse === true,
      ),
    ).toBe(true);
    expect(schemaIndexes.some(([fields]) => fields.type === 1)).toBe(true);
  });
});
