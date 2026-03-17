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
  const defaultPagination = {
    currentPage: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };

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

  const videoItem = {
    url: "user_123/media/generated-video.mp4",
    taskId: "task_3",
    taskTitle: "Showreel clip",
    personaLabel: "Creator",
    personaIcon: "bi bi-camera-reels",
    createdAtLabel: "Today",
    href: "/app/c/task_3",
  };

  it("renders image card thumbnail with preview and download controls", () => {
    render(
      <LibraryTabs
        conversations={[]}
        images={[imageItem]}
        audios={[]}
        videos={[]}
        conversationsPagination={defaultPagination}
        imagesPagination={{
          currentPage: 2,
          hasPreviousPage: true,
          hasNextPage: true,
        }}
        audiosPagination={defaultPagination}
        videosPagination={defaultPagination}
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

    expect(
      screen.getByRole("link", { name: "Previous" }).getAttribute("href"),
    ).toBe("/app/library?tab=images&imagesPage=1");
    expect(
      screen.getByRole("link", { name: "Next" }).getAttribute("href"),
    ).toBe("/app/library?tab=images&imagesPage=3");
  });

  it("renders audio card controls with secure download URL", () => {
    const { container } = render(
      <LibraryTabs
        conversations={[]}
        images={[]}
        audios={[audioItem]}
        videos={[]}
        conversationsPagination={defaultPagination}
        imagesPagination={defaultPagination}
        audiosPagination={defaultPagination}
        videosPagination={defaultPagination}
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

  it("renders video card playback and download controls", () => {
    const { container } = render(
      <LibraryTabs
        conversations={[]}
        images={[]}
        audios={[]}
        videos={[videoItem]}
        conversationsPagination={defaultPagination}
        imagesPagination={defaultPagination}
        audiosPagination={defaultPagination}
        videosPagination={{
          currentPage: 2,
          hasPreviousPage: true,
          hasNextPage: true,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Videos/i }));

    const videoElement = container.querySelector("video") as HTMLVideoElement;

    expect(videoElement.tagName).toBe("VIDEO");
    expect(videoElement.querySelector("source")?.getAttribute("src")).toContain(
      "/api/download?key=",
    );

    const downloadLink = screen.getByRole("link", { name: /Download/i });
    expect(downloadLink.getAttribute("href")).toContain(
      "/api/download?key=user_123%2Fmedia%2Fgenerated-video.mp4&download=1",
    );
    expect(
      screen.getByRole("link", { name: "Previous" }).getAttribute("href"),
    ).toBe("/app/library?tab=videos&videosPage=1");
    expect(
      screen.getByRole("link", { name: "Next" }).getAttribute("href"),
    ).toBe("/app/library?tab=videos&videosPage=3");
  });
});
