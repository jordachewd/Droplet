/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import LibraryTabs from "@/components/chat/library-tabs";

type MockNextImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
  unoptimized?: boolean;
};

vi.mock("next/image", () => ({
  default: (props: MockNextImageProps) => {
    const sanitizedProps = { ...props };
    delete sanitizedProps.priority;
    delete sanitizedProps.unoptimized;

    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={sanitizedProps.alt || ""} {...sanitizedProps} />;
  },
}));

describe("LibraryTabs media cards", () => {
  const imageItem = {
    url: "user_123/media/generated-image.webp",
    taskId: "task_1",
    taskTitle: "Poster concept",
    personaLabel: "Creator",
    personaIcon: "bi bi-stars",
    createdAtLabel: "Today",
    href: "/app/c/task_1",
  };

  const audioItem = {
    url: "user_123/media/generated-audio.mp3",
    taskId: "task_2",
    taskTitle: "Voice note",
    personaLabel: "Teacher",
    personaIcon: "bi bi-book",
    createdAtLabel: "Today",
    href: "/app/c/task_2",
  };

  it("renders image card thumbnail with preview and download controls", () => {
    render(
      <LibraryTabs
        conversations={[]}
        images={[imageItem]}
        audios={[]}
        videos={[]}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Images/i }));

    const thumbnail = screen.getByAltText(
      "Generated image from Poster concept",
    );
    expect(thumbnail.getAttribute("src")).toContain("/api/download?key=");

    const previewLink = screen.getByRole("link", { name: /Preview/i });
    expect(previewLink.getAttribute("href")).toContain("/api/download?key=");

    const downloadLink = screen.getByRole("link", { name: /Download/i });
    expect(downloadLink.getAttribute("href")).toContain(
      "/api/download?key=user_123%2Fmedia%2Fgenerated-image.webp&download=1",
    );
  });

  it("renders audio card controls with secure download URL", () => {
    const { container } = render(
      <LibraryTabs
        conversations={[]}
        images={[]}
        audios={[audioItem]}
        videos={[]}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Audios/i }));

    const audioElement = container.querySelector("audio") as HTMLAudioElement;

    expect(audioElement.tagName).toBe("AUDIO");
    expect(audioElement.getAttribute("src")).toContain("/api/download?key=");

    const downloadLink = screen.getByRole("link", { name: /Download/i });
    expect(downloadLink.getAttribute("href")).toContain(
      "/api/download?key=user_123%2Fmedia%2Fgenerated-audio.mp3&download=1",
    );
  });
});
