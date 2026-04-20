import "server-only";
import { Document, Schema, model, models } from "mongoose";

interface IAppSetting extends Document {
  key: string;
  value: unknown;
  category: "plans" | "models" | "theme" | "limits" | "trial" | "features";
  updatedAt: Date;
  updatedBy: string;
}

const AppSettingSchema = new Schema<IAppSetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    category: {
      type: String,
      required: true,
      enum: ["plans", "models", "theme", "limits", "trial", "features"],
      index: true,
    },
    updatedAt: { type: Date, required: true, default: Date.now },
    updatedBy: { type: String, required: true },
  },
  { strict: true },
);

const AppSetting =
  models.AppSetting || model<IAppSetting>("AppSetting", AppSettingSchema);

export default AppSetting;
