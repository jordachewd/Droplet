#!/usr/bin/env node
/**
 * Phase 217-A helper: seed Stripe recurring billing settings in AppSetting.
 *
 * Required env:
 * - MONGODB_URL
 * - MONGODB_DB_NAME
 *
 * Optional env:
 * - STRIPE_PRICE_PRO_MONTHLY
 * - STRIPE_PRICE_PRO_YEARLY
 * - STRIPE_PRICE_PREMIUM_MONTHLY
 * - STRIPE_PRICE_PREMIUM_YEARLY
 * - YEARLY_DISCOUNT (defaults to 30)
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
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME?.trim();
const RAW_YEARLY_DISCOUNT = process.env.YEARLY_DISCOUNT ?? "30";
const parsedYearlyDiscount = Number(RAW_YEARLY_DISCOUNT);

if (!MONGODB_URL || !MONGODB_DB_NAME) {
  console.error(
    "Error: MONGODB_URL and MONGODB_DB_NAME must be set in .env.local",
  );
  process.exit(1);
}

if (!Number.isFinite(parsedYearlyDiscount) || parsedYearlyDiscount < 0) {
  console.error("Error: YEARLY_DISCOUNT must be a non-negative number.");
  process.exit(1);
}

const stripePriceIds = {
  proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  proYearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
  premiumMonthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
  premiumYearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY ?? "",
};

async function run() {
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(MONGODB_URL, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    const appSettingsCollection = db.collection("appsettings");
    const now = new Date();
    const updatedBy = "system:phase-217-a";

    await Promise.all([
      appSettingsCollection.updateOne(
        { key: "admin.stripePriceIds" },
        {
          $set: {
            value: stripePriceIds,
            category: "plans",
            updatedAt: now,
            updatedBy,
          },
        },
        { upsert: true },
      ),
      appSettingsCollection.updateOne(
        { key: "admin.yearlyDiscount" },
        {
          $set: {
            value: { yearlyDiscount: parsedYearlyDiscount },
            category: "plans",
            updatedAt: now,
            updatedBy,
          },
        },
        { upsert: true },
      ),
    ]);

    console.log("Seeded keys:");
    console.log("  - admin.stripePriceIds");
    console.log("  - admin.yearlyDiscount");
    console.log("Stripe price IDs:", stripePriceIds);
    console.log("Yearly discount:", parsedYearlyDiscount);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
