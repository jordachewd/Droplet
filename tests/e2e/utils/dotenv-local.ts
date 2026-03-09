import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let cachedDotEnvLocalValues: Record<string, string> | null = null;

function parseDotEnvValue(rawValue: string): string {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function getDotEnvLocalValues(): Record<string, string> {
  if (cachedDotEnvLocalValues) {
    return cachedDotEnvLocalValues;
  }

  const envPath = resolve(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    cachedDotEnvLocalValues = {};
    return cachedDotEnvLocalValues;
  }

  const envFile = readFileSync(envPath, "utf-8");
  const lines = envFile.split(/\r?\n/);
  const values: Record<string, string> = {};

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const [rawKey, ...rawValueParts] = line.split("=");
    const key = rawKey?.trim();

    if (!key) {
      continue;
    }

    values[key] = parseDotEnvValue(rawValueParts.join("="));
  }

  cachedDotEnvLocalValues = values;
  return cachedDotEnvLocalValues;
}

export function getEnvValue(key: string): string | undefined {
  return process.env[key] ?? getDotEnvLocalValues()[key];
}
