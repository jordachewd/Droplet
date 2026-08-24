"use server";
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import User from "@/lib/database/models/user.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { handleError } from "@/lib/utils/handleError";
import { VALID_PERSONA_ID_SET } from "@/constants/assistant-personas";

const intentSchema = z.enum([
  "productivity",
  "learning",
  "creative",
  "technical",
  "career",
]);

const challengeSchema = z.enum([
  "decisions",
  "learning",
  "content",
  "software",
  "wellness",
]);

const expectationSchema = z.enum([
  "direct",
  "guided",
  "challenger",
  "explorer",
]);

const communicationStyleSchema = z.enum([
  "concise",
  "detailed",
  "structured",
  "conversational",
]);

const personaIdSchema = z
  .string()
  .refine((id) => VALID_PERSONA_ID_SET.has(id as never), {
    message: "Invalid persona ID",
  });

const completeOnboardingSchema = z.object({
  intent: intentSchema,
  challenge: challengeSchema,
  expectation: expectationSchema,
  communicationStyle: communicationStyleSchema,
  defaultPersonaId: personaIdSchema,
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

export async function completeOnboarding(input: CompleteOnboardingInput) {
  try {
    const parsed = completeOnboardingSchema.safeParse(input);
    if (!parsed.success) throw new Error("Invalid onboarding data.");

    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDatabase();

    const now = new Date();
    const updatedUser = await User.findOneAndUpdate(
      {
        clerkId: userId,
        onboardingCompleted: { $ne: true },
      },
      {
        $set: {
          onboardingCompleted: true,
          "preferences.intent": parsed.data.intent,
          "preferences.challenge": parsed.data.challenge,
          "preferences.expectation": parsed.data.expectation,
          "preferences.communicationStyle": parsed.data.communicationStyle,
          "preferences.defaultPersonaId": parsed.data.defaultPersonaId,
          "preferences.onboardedAt": now,
          updatedAt: now,
        },
      },
      { returnDocument: "after", strict: true },
    ).lean();

    if (!updatedUser) {
      const existingUser = await User.findOne({ clerkId: userId })
        .select("onboardingCompleted")
        .lean<{ onboardingCompleted?: boolean }>();

      if (!existingUser) throw new Error("User not found.");
      return { success: true };
    }

    revalidatePath("/app");
    return { success: true };
  } catch (error) {
    handleError({ error, source: "completeOnboarding" });
  }
}

const updatePreferencesSchema = z.object({
  intent: intentSchema.optional(),
  challenge: challengeSchema.optional(),
  expectation: expectationSchema.optional(),
  communicationStyle: communicationStyleSchema.optional(),
  defaultPersonaId: personaIdSchema.optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export async function updatePreferences(input: UpdatePreferencesInput) {
  try {
    const parsed = updatePreferencesSchema.safeParse(input);
    if (!parsed.success) throw new Error("Invalid preferences data.");

    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDatabase();

    const setFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        setFields[`preferences.${key}`] = value;
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { clerkId: userId },
      { $set: setFields },
      { returnDocument: "after", strict: true },
    ).lean();

    if (!updatedUser) throw new Error("User not found.");

    revalidatePath("/app");
    revalidatePath("/app/settings");
    return { success: true };
  } catch (error) {
    handleError({ error, source: "updatePreferences" });
  }
}
