import { describe, expect, it } from "vitest";
import Upload from "@/lib/database/models/upload.model";

type SchemaIndex = [Record<string, number>, Record<string, unknown>];

describe("Upload model", () => {
  it("defines upload metadata schema with strict mode", () => {
    const upload = new Upload({
      userId: "user_123",
      fileName: "report.pdf",
      objectKey: "user_123/uploads/report.pdf",
      s3Url: "/api/download?key=user_123%2Fuploads%2Freport.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
      createdAt: new Date("2026-03-27T00:00:00.000Z"),
    });

    expect(upload.validateSync()).toBeUndefined();
    expect(Upload.schema.options.strict).toBe(true);
  });

  it("requires userId and objectKey", () => {
    const upload = new Upload({
      userId: undefined,
      fileName: "report.pdf",
      objectKey: undefined,
      s3Url: "/api/download?key=user_123%2Fuploads%2Freport.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
      createdAt: new Date("2026-03-27T00:00:00.000Z"),
    });
    const error = upload.validateSync();

    expect(error?.errors.userId).toBeTruthy();
    expect(error?.errors.objectKey).toBeTruthy();
  });

  it("has the compound index for userId + createdAt sort", () => {
    const schemaIndexes = Upload.schema.indexes() as SchemaIndex[];

    expect(
      schemaIndexes.some(
        ([fields]) => fields.userId === 1 && fields.createdAt === -1,
      ),
    ).toBe(true);
  });
});
