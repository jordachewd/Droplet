import "server-only";
import { Document, Schema, model, models } from "mongoose";

interface IUpload extends Document {
  userId: string;
  fileName: string;
  objectKey: string;
  s3Url: string;
  contentType: string;
  sizeBytes: number;
  taskId?: string;
  createdAt: Date;
}

const UploadSchema = new Schema<IUpload>(
  {
    userId: { type: String, required: true },
    fileName: { type: String, required: true },
    objectKey: { type: String, required: true },
    s3Url: { type: String, required: true },
    contentType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    taskId: { type: String },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { strict: true },
);

UploadSchema.index({ userId: 1, createdAt: -1 });

const Upload = models.Upload || model<IUpload>("Upload", UploadSchema);

export default Upload;
