#!/usr/bin/env node
/**
 * Migration script: Handle orphaned persona IDs after Phase 41 persona restructure.
 *
 * What it does:
 *   1. Reassigns Task.personaId "analyst" → "strategist" (merged persona)
 *   2. Reassigns UsageEvent.personaId "analyst" → "strategist"
 *   3. Cleans up AppSetting persona_access_* keys to remove invalid persona IDs
 *   4. Companion persona IDs (best-friend, boyfriend, girlfriend) are left in place —
 *      code-level fallback in getPersona() renders them as "Strategist" gracefully.
 *
 * Usage:
 *   node scripts/migrate-removed-personas.mjs
 *
 * Requires MONGODB_URL and MONGODB_DB_NAME in .env.local.
 * MONGODB_URL_FALLBACK is used when SRV DNS lookup fails.
 *
 * Safe to run multiple times (idempotent).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDotenvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmedLine.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotenvFile(path.join(__dirname, "..", ".env.local"));
loadDotenvFile(path.join(__dirname, "..", ".env"));

const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_URL_FALLBACK = process.env.MONGODB_URL_FALLBACK;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME?.trim();

if (!MONGODB_URL || !MONGODB_DB_NAME) {
  console.error(
    "Error: MONGODB_URL and MONGODB_DB_NAME must be set in .env.local",
  );
  process.exit(1);
}

const VALID_PERSONA_IDS = new Set([
  "strategist",
  "teacher",
  "developer",
  "creator",
  "wellness",
  "interviewer",
]);

const PERSONA_ACCESS_KEYS = [
  "persona_access_lite",
  "persona_access_pro",
  "persona_access_premium",
];

async function run() {
  const { MongoClient } = await import("mongodb");

  let client = new MongoClient(MONGODB_URL, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    try {
      await client.connect();
    } catch (error) {
      if (!isSrvDnsLookupError(error) || !MONGODB_URL_FALLBACK) {
        throw error;
      }

      console.warn(
        "MongoDB SRV DNS lookup failed; retrying with MONGODB_URL_FALLBACK.",
      );
      await client.close();
      client = new MongoClient(MONGODB_URL_FALLBACK, {
        serverSelectionTimeoutMS: 5000,
      });
      await client.connect();
    }

    console.log(`Connected to MongoDB (${MONGODB_DB_NAME})\n`);

    const db = client.db(MONGODB_DB_NAME);

    // Step 1: Reassign analyst → strategist in Tasks
    console.log("--- Step 1: Reassign Task.personaId analyst → strategist ---");
    const taskResult = await db
      .collection("tasks")
      .updateMany(
        { personaId: "analyst" },
        { $set: { personaId: "strategist" } },
      );
    console.log(
      `  Tasks matched: ${taskResult.matchedCount}, modified: ${taskResult.modifiedCount}`,
    );

    // Step 2: Reassign analyst → strategist in UsageEvents
    console.log(
      "\n--- Step 2: Reassign UsageEvent.personaId analyst → strategist ---",
    );
    const usageResult = await db
      .collection("usageevents")
      .updateMany(
        { personaId: "analyst" },
        { $set: { personaId: "strategist" } },
      );
    console.log(
      `  UsageEvents matched: ${usageResult.matchedCount}, modified: ${usageResult.modifiedCount}`,
    );

    // Step 3: Report companion persona counts (not reassigned — kept for readability)
    console.log(
      "\n--- Step 3: Companion persona record counts (kept as-is) ---",
    );
    for (const personaId of ["best-friend", "boyfriend", "girlfriend"]) {
      const taskCount = await db
        .collection("tasks")
        .countDocuments({ personaId });
      const usageCount = await db
        .collection("usageevents")
        .countDocuments({ personaId });
      console.log(
        `  ${personaId}: ${taskCount} tasks, ${usageCount} usage events`,
      );
    }

    // Step 4: Clean up AppSetting persona access keys
    console.log("\n--- Step 4: Clean AppSetting persona access keys ---");
    for (const key of PERSONA_ACCESS_KEYS) {
      const doc = await db.collection("appsettings").findOne({ key });

      if (!doc) {
        console.log(`  ${key}: not found (skipped)`);
        continue;
      }

      if (!Array.isArray(doc.value)) {
        console.log(`  ${key}: value is not an array (skipped)`);
        continue;
      }

      const original = doc.value;
      const cleaned = original.filter(
        (id) => typeof id === "string" && VALID_PERSONA_IDS.has(id),
      );
      const removed = original.filter(
        (id) => typeof id !== "string" || !VALID_PERSONA_IDS.has(id),
      );

      if (removed.length === 0) {
        console.log(`  ${key}: already clean (${cleaned.length} valid IDs)`);
        continue;
      }

      await db
        .collection("appsettings")
        .updateOne(
          { key },
          { $set: { value: cleaned, updatedAt: new Date() } },
        );
      console.log(
        `  ${key}: removed [${removed.join(", ")}], kept [${cleaned.join(", ")}]`,
      );
    }

    // Summary
    console.log("\n--- Summary ---");
    console.log("  analyst → strategist reassignment: complete");
    console.log(
      "  Companion records: preserved (getPersona() fallback handles display)",
    );
    console.log("  AppSetting cleanup: complete");
    console.log(
      "  Code-level protections: getPersona() fallback, allowedPersonaIds filter, normalizePersonaIdArray()",
    );
    console.log("\nMigration complete.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

function isSrvDnsLookupError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("querysrv") || message.includes("econnrefused");
}

run();
