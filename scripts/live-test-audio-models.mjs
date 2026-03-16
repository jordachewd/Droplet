#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

function toErrorDetails(error) {
  return {
    name: error?.name ?? "Error",
    message: error?.message ?? "Unknown error",
    status: "status" in error ? error.status : undefined,
    code: "code" in error ? error.code : undefined,
    type: "type" in error ? error.type : undefined,
    param: "param" in error ? error.param : undefined,
  };
}

function decodeBase64Audio(base64Data) {
  if (!base64Data || typeof base64Data !== "string") {
    return null;
  }

  const normalized = base64Data.replace(/\s+/g, "");
  if (!normalized) {
    return null;
  }

  const buffer = Buffer.from(normalized, "base64");
  return buffer.byteLength > 0 ? buffer : null;
}

loadDotenvFile(path.resolve(process.cwd(), ".env.local"));

const requiredOpenAiEnv = ["OPENAI_KEY", "OPENAI_ORG", "OPENAI_PRJ"];
const missingOpenAiEnv = requiredOpenAiEnv.filter((name) => !process.env[name]);

if (missingOpenAiEnv.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "Missing required OpenAI environment variables.",
        missing: missingOpenAiEnv,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const openAiClient = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
  organization: process.env.OPENAI_ORG,
  project: process.env.OPENAI_PRJ,
});

const ttsModel = "gpt-4o-mini-tts";
const fullAudioModels = ["gpt-audio-mini", "gpt-audio-1.5"];
const ttsInputText =
  "Droplet live verification. This confirms text to speech output is working.";
const audioInOutPrompt = "Say: Audio model verification successful, then stop.";
const generatedAudioFormat = "wav";

async function probeTtsModel() {
  const startedAt = Date.now();

  try {
    const response = await openAiClient.audio.speech.create({
      model: ttsModel,
      voice: "alloy",
      input: ttsInputText,
      response_format: generatedAudioFormat,
    });
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return {
      ok: audioBuffer.byteLength > 0,
      model: ttsModel,
      endpoint: "audio.speech.create",
      latencyMs: Date.now() - startedAt,
      audioBytes: audioBuffer.byteLength,
      audioFormat: generatedAudioFormat,
      audioBuffer,
    };
  } catch (error) {
    return {
      ok: false,
      model: ttsModel,
      endpoint: "audio.speech.create",
      latencyMs: Date.now() - startedAt,
      error: toErrorDetails(error),
    };
  }
}

async function probeFullAudioModel(model) {
  const startedAt = Date.now();

  try {
    const response = await openAiClient.chat.completions.create({
      model,
      modalities: ["text", "audio"],
      audio: { voice: "alloy", format: generatedAudioFormat },
      messages: [{ role: "user", content: audioInOutPrompt }],
    });
    const audioData = response?.choices?.[0]?.message?.audio?.data;
    const audioBuffer = decodeBase64Audio(audioData);

    return {
      ok: Boolean(audioBuffer),
      model,
      endpoint: "chat.completions.create",
      latencyMs: Date.now() - startedAt,
      audioBytes: audioBuffer?.byteLength ?? 0,
      transcript: response?.choices?.[0]?.message?.audio?.transcript ?? null,
      usage: response?.usage ?? null,
      error: audioBuffer
        ? undefined
        : {
            name: "NoAudioData",
            message: "Response did not include decodable audio data.",
          },
    };
  } catch (error) {
    return {
      ok: false,
      model,
      endpoint: "chat.completions.create",
      latencyMs: Date.now() - startedAt,
      error: toErrorDetails(error),
    };
  }
}

function buildS3ClientOrNull() {
  const requiredAwsEnv = [
    "AWS_S3_REGION",
    "AWS_S3_ACCESS_ID",
    "AWS_S3_SECRET_KEY",
    "AWS_S3_BUCKET",
  ];
  const missingAwsEnv = requiredAwsEnv.filter((name) => !process.env[name]);

  if (missingAwsEnv.length > 0) {
    return {
      client: null,
      bucket: null,
      missingAwsEnv,
    };
  }

  return {
    client: new S3Client({
      region: process.env.AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_KEY,
      },
    }),
    bucket: process.env.AWS_S3_BUCKET,
    missingAwsEnv: [],
  };
}

async function verifyOpenAiToS3Pipeline(ttsResult) {
  if (!ttsResult.ok || !ttsResult.audioBuffer) {
    return {
      ok: false,
      skipped: true,
      reason: "TTS probe did not produce audio bytes.",
    };
  }

  const { client, bucket, missingAwsEnv } = buildS3ClientOrNull();

  if (!client || !bucket) {
    return {
      ok: false,
      skipped: true,
      reason: "Missing AWS S3 environment variables.",
      missingAwsEnv,
    };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const objectKey = `live-tests/audio/${timestamp}-tts-verification.${generatedAudioFormat}`;
  const startedAt = Date.now();

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: ttsResult.audioBuffer,
        ContentType: "audio/wav",
      }),
    );

    return {
      ok: true,
      skipped: false,
      latencyMs: Date.now() - startedAt,
      objectKey,
      privateUrl: `/api/download?key=${encodeURIComponent(objectKey)}`,
      audioBytes: ttsResult.audioBuffer.byteLength,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      latencyMs: Date.now() - startedAt,
      objectKey,
      error: toErrorDetails(error),
    };
  }
}

async function main() {
  const ttsResult = await probeTtsModel();
  const fullAudioResults = [];

  for (const model of fullAudioModels) {
    fullAudioResults.push(await probeFullAudioModel(model));
  }

  const pipelineResult = await verifyOpenAiToS3Pipeline(ttsResult);

  console.log(
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        tts: {
          ...ttsResult,
          audioBuffer: undefined,
        },
        fullAudio: fullAudioResults,
        pipeline: pipelineResult,
      },
      null,
      2,
    ),
  );
}

await main();
