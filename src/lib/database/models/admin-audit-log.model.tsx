import { Document, Schema, model, models } from "mongoose";

interface IAdminAuditLog extends Document {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: unknown;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    adminId: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    createdAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { strict: true },
);

const AdminAuditLog =
  models.AdminAuditLog ||
  model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);

export default AdminAuditLog;
