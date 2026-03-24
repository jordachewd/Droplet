import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/database/mongoose";
import AdminAuditLog from "@/lib/database/models/admin-audit-log.model";
import { createAdminAuditLogEntry } from "@/lib/utils/admin-audit";
import { createTestUser } from "../test-support";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/admin-audit-log.model", () => ({
  default: {
    create: vi.fn(),
  },
}));

describe("admin-audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("connects to database and creates an audit log entry", async () => {
    const admin = createTestUser({ role: "admin", clerkId: "admin_abc" });

    await createAdminAuditLogEntry({
      adminId: admin.clerkId,
      action: "update_user",
      targetType: "user",
      targetId: "user_777",
      details: { suspended: true },
    });

    expect(connectToDatabase).toHaveBeenCalledTimes(1);
    expect(AdminAuditLog.create).toHaveBeenCalledTimes(1);
    expect(AdminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: "admin_abc",
        action: "update_user",
        targetType: "user",
        targetId: "user_777",
        details: { suspended: true },
        createdAt: expect.any(Date),
      }),
    );
  });

  it("supports entries without details", async () => {
    const admin = createTestUser({
      role: "admin",
      clerkId: "admin_no_details",
    });

    await createAdminAuditLogEntry({
      adminId: admin.clerkId,
      action: "clear_cache",
      targetType: "system",
      targetId: "global",
    });

    expect(AdminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: "admin_no_details",
        details: undefined,
      }),
    );
  });
});
