#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

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

loadDotenvFile(path.resolve(process.cwd(), ".env.local"));

const requiredEnv = ["OPENAI_KEY", "OPENAI_ORG", "OPENAI_PRJ"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "Missing required environment variables.",
        missing: missingEnv,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
  organization: process.env.OPENAI_ORG,
  project: process.env.OPENAI_PRJ,
});

const prompt = "A flat icon of a blue water droplet on a white background.";
const modelsToProbe = ["gpt-image-1-mini", "gpt-image-1.5", "gpt-image-1"];

async function probeModel(model, withB64ResponseFormat) {
  const input = {
    model,
    prompt,
  };

  if (withB64ResponseFormat) {
    input.response_format = "b64_json";
  }

  const startedAt = Date.now();

  try {
    const response = await client.images.generate(input);
    const firstItem = response?.data?.[0] ?? null;

    return {
      ok: true,
      model,
      request: {
        response_format: withB64ResponseFormat ? "b64_json" : "(default)",
      },
      latencyMs: Date.now() - startedAt,
      response: {
        created: response?.created ?? null,
        dataLength: Array.isArray(response?.data) ? response.data.length : 0,
        firstItemKeys:
          firstItem && typeof firstItem === "object"
            ? Object.keys(firstItem).sort()
            : [],
        hasB64Json:
          Boolean(firstItem?.b64_json) &&
          typeof firstItem?.b64_json === "string",
        revisedPrompt:
          firstItem &&
          typeof firstItem === "object" &&
          "revised_prompt" in firstItem
            ? firstItem.revised_prompt
            : null,
      },
    };
  } catch (error) {
    const apiError = /** @type {import("openai").APIError | Error} */ (error);

    return {
      ok: false,
      model,
      request: {
        response_format: withB64ResponseFormat ? "b64_json" : "(default)",
      },
      latencyMs: Date.now() - startedAt,
      error: {
        name: apiError?.name ?? "Error",
        message: apiError?.message ?? "Unknown error",
        status: "status" in apiError ? apiError.status : undefined,
        code: "code" in apiError ? apiError.code : undefined,
        type: "type" in apiError ? apiError.type : undefined,
        param: "param" in apiError ? apiError.param : undefined,
      },
    };
  }
}

const results = [];

for (const model of modelsToProbe) {
  results.push(await probeModel(model, true));
  results.push(await probeModel(model, false));
}

console.log(
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      prompt,
      results,
    },
    null,
    2,
  ),
);
