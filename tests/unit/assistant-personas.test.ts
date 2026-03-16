import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/constants/assistant-personas";

describe("assistant personas", () => {
  it("keeps all 10 personas image-enabled and audio-enabled", () => {
    expect(PERSONAS).toHaveLength(10);

    for (const persona of PERSONAS) {
      expect(persona.supportsImage).toBe(true);
      expect(persona.supportsAudio).toBe(true);
    }
  });
});
