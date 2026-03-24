import { describe, expect, it } from "vitest";
import {
  classifyTaskComplexity,
  isExplicitDeepAnalysisRequest,
} from "@/lib/utils/openai/classify-task-complexity";
import { Message } from "@/types";

function createUserMessage(text: string): Message {
  return {
    role: "user",
    whois: "user",
    content: [{ type: "text", text }],
  };
}

function createAssistantMessage(text: string): Message {
  return {
    role: "assistant",
    whois: "assistant",
    content: [{ type: "text", text }],
  };
}

describe("classifyTaskComplexity", () => {
  it("classifies short conversational prompts as simple", () => {
    const latestUserMessage = createUserMessage("What is TypeScript?");

    const taskClass = classifyTaskComplexity({
      messages: [latestUserMessage],
      latestUserMessage,
    });

    expect(taskClass).toBe("simple");
  });

  it("keeps normal chat prompts at the standard tier", () => {
    const latestUserMessage = createUserMessage(
      "Can you help me draft a short status update for the team?",
    );

    const taskClass = classifyTaskComplexity({
      messages: [latestUserMessage],
      latestUserMessage,
    });

    expect(taskClass).toBe("standard");
  });

  it("classifies explicit deep-analysis requests as complex", () => {
    const latestUserMessage = createUserMessage(
      "Please do a deep analysis of this architecture review and walk me through the trade-offs step by step.",
    );

    const taskClass = classifyTaskComplexity({
      messages: [latestUserMessage],
      latestUserMessage,
    });

    expect(taskClass).toBe("complex");
    expect(isExplicitDeepAnalysisRequest(latestUserMessage)).toBe(true);
  });

  it("classifies long technical prompts with deeper history as complex", () => {
    const messages: Message[] = [
      createUserMessage("We already reviewed the failing deployment."),
      {
        role: "assistant",
        whois: "assistant",
        content: [{ type: "text", text: "I understand. Continue." }],
      },
      createUserMessage("The database migration also failed in staging."),
      {
        role: "assistant",
        whois: "assistant",
        content: [{ type: "text", text: "Share the remaining details." }],
      },
      createUserMessage(
        "The incident spans our API, database schema, test coverage, and concurrency handling. I need a technical plan that compares trade-offs, explains the failure modes, and outlines an implementation and rollback strategy for production.",
      ),
      {
        role: "assistant",
        whois: "assistant",
        content: [{ type: "text", text: "Understood." }],
      },
      createUserMessage(
        "Please continue with the production debugging details and the integration test gaps.",
      ),
    ];

    const taskClass = classifyTaskComplexity({
      messages,
      latestUserMessage: messages.at(-1),
    });

    expect(taskClass).toBe("complex");
  });

  it("returns standard when the latest message has no text content", () => {
    const taskClass = classifyTaskComplexity({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "image_url", image_url: { url: "/image.png" } }],
        },
      ],
    });

    expect(taskClass).toBe("standard");
  });

  it("classifies very long prompts as complex even without explicit deep-analysis language", () => {
    const longPrompt = "a".repeat(500);

    const taskClass = classifyTaskComplexity({
      messages: [createUserMessage(longPrompt)],
    });

    expect(taskClass).toBe("complex");
  });

  it("classifies analytical prompts as complex when keyword density and history are moderate", () => {
    const messages: Message[] = [
      createUserMessage("Start"),
      createAssistantMessage("Ack"),
      createUserMessage("Continue"),
      createAssistantMessage("Ack"),
      createUserMessage("Continue"),
      createAssistantMessage("Ack"),
      createUserMessage(
        "I need help with database schema migration and security tradeoff analysis for this technical implementation.",
      ),
    ];

    const taskClass = classifyTaskComplexity({
      messages,
    });

    expect(taskClass).toBe("complex");
  });

  it("uses latestUserMessage over messages.at(-1) when explicitly provided", () => {
    const taskClass = classifyTaskComplexity({
      messages: [
        createUserMessage("What is the weather?"),
        createAssistantMessage("Sunny"),
      ],
      latestUserMessage: createUserMessage(
        "Please do a deep dive into this architecture review.",
      ),
    });

    expect(taskClass).toBe("complex");
  });

  it("detects explicit deep-analysis requests only when text is present", () => {
    expect(
      isExplicitDeepAnalysisRequest({
        role: "user",
        whois: "user",
        content: [{ type: "image_url", image_url: { url: "/example.png" } }],
      }),
    ).toBe(false);
  });
});
