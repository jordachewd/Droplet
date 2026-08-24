import "server-only";
import { Document, Schema, model, models } from "mongoose";

interface IPublicPage extends Document {
  slug: string;
  title: string;
  content: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

const PublicPageSchema = new Schema<IPublicPage>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    sortOrder: { type: Number, required: true, default: 0 },
    isPublished: { type: Boolean, required: true, default: false },
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
    updatedBy: { type: String, required: true },
  },
  { strict: true },
);

const PublicPage =
  models.PublicPage || model<IPublicPage>("PublicPage", PublicPageSchema);

export default PublicPage;
