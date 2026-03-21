import { describe, expect, it } from "vitest";
import User from "@/lib/database/models/user.model";

describe("User model", () => {
  it("defaults new users to a permanent Lite plan", () => {
    const user = new User({
      clerkId: "clerk_user_1",
      username: "adal",
      email: "adal@example.com",
    });

    expect(user.validateSync()).toBeUndefined();
    expect(user.plan.name).toBe("Lite");
    expect(user.plan.amount).toBe(0);
    expect(user.plan.expiresOn.toISOString()).toBe("9999-12-31T23:59:59.999Z");
  });
});
