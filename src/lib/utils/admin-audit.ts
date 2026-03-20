import "server-only";

import { connectToDatabase } from "@/lib/database/mongoose";
import AdminAuditLog from "@/lib/database/models/admin-audit-log.model";

export async function createAdminAuditLogEntry({
  adminId,
  action,
  targetType,
  targetId,
  details,
}: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: unknown;
}) {
  await connectToDatabase();

  await AdminAuditLog.create({
    adminId,
    action,
    targetType,
    targetId,
    details,
    createdAt: new Date(),
  });
}
