import { describe, expect, it } from "vitest";
import Task from "@/lib/database/models/tasks.model";
import UsageEvent from "@/lib/database/models/usage-event.model";
import AppSetting from "@/lib/database/models/app-setting.model";
import PublicPage from "@/lib/database/models/public-page.model";
import AdminAuditLog from "@/lib/database/models/admin-audit-log.model";
import type { CreateUsageEventParams } from "@/types/UsageEventData.d";

describe("Phase 14 data model foundation", () => {
  it("adds forward-compatible lifecycle defaults to tasks", () => {
    const task = new Task({
      userId: "clerk_user_1",
      title: "Conversation",
      messages: [],
      usage: 0,
    });

    expect(task.validateSync()).toBeUndefined();
    expect(task.promptCount).toBe(0);
    expect(task.mediaCount).toBe(0);
    expect(task.estimatedBytes).toBe(0);
    expect(task.status).toBe("active");
    expect(task.endedAt).toBeUndefined();
    expect(task.endedReason).toBeUndefined();
    expect(task.endAction).toBeUndefined();
    expect(Task.schema.path("createdAt")?.options.index).toBe(true);
  });

  it("defines UsageEvent with strict schema, required fields, and indexes", () => {
    const usageEventInput: CreateUsageEventParams = {
      userId: "clerk_user_1",
      taskId: "task_1",
      personaId: "strategist",
      model: "gpt-4o-mini",
      provider: "openai",
      requestType: "chat",
      blocked: false,
    };
    const usageEvent = new UsageEvent(usageEventInput);

    expect(usageEvent.validateSync()).toBeUndefined();
    expect(UsageEvent.schema.options.strict).toBe(true);
    expect(UsageEvent.schema.path("userId")?.options.index).toBe(true);
    expect(UsageEvent.schema.path("taskId")?.options.index).toBe(true);
    expect(UsageEvent.schema.path("personaId")?.options.index).toBe(true);
    expect(UsageEvent.schema.path("model")?.options.index).toBe(true);
    expect(UsageEvent.schema.path("requestType")?.options.index).toBe(true);
    expect(UsageEvent.schema.path("createdAt")?.options.index).toBe(true);
  });

  it("defines AppSetting with keyed configuration storage", () => {
    const appSetting = new AppSetting({
      key: "plans.default",
      value: { name: "Lite" },
      category: "plans",
      updatedBy: "admin_clerk_1",
    });

    expect(appSetting.validateSync()).toBeUndefined();
    expect(AppSetting.schema.path("key")?.options.unique).toBe(true);
    expect(AppSetting.schema.path("category")?.options.index).toBe(true);
  });

  it("defines PublicPage with publish state and unique slug", () => {
    const publicPage = new PublicPage({
      slug: "about",
      title: "About",
      content: "<p>About Droplet</p>",
      updatedBy: "admin_clerk_1",
    });

    expect(publicPage.validateSync()).toBeUndefined();
    expect(publicPage.isPublished).toBe(false);
    expect(PublicPage.schema.path("slug")?.options.unique).toBe(true);
  });

  it("defines AdminAuditLog with indexed admin metadata", () => {
    const auditLog = new AdminAuditLog({
      adminId: "admin_clerk_1",
      action: "page.publish",
      targetType: "PublicPage",
      targetId: "page_1",
      details: { slug: "about" },
    });

    expect(auditLog.validateSync()).toBeUndefined();
    expect(AdminAuditLog.schema.path("adminId")?.options.index).toBe(true);
    expect(AdminAuditLog.schema.path("action")?.options.index).toBe(true);
    expect(AdminAuditLog.schema.path("createdAt")?.options.index).toBe(true);
  });
});
