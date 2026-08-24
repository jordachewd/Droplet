/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import ImageHolder from "@/components/shared/image-holder";

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

vi.mock("@/lib/utils/aws/s3-file-reference", () => ({
  resolveStoredAssetUrl: (value: string) => value,
}));

beforeAll(() => {
  if (typeof HTMLDialogElement === "undefined") {
    return;
  }

  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  }
});

describe("ImageHolder", () => {
  it("opens and closes the image lightbox with close and download controls", async () => {
    render(
      <ImageHolder
        src="/api/download?key=user_123%2Fmedia%2Fgenerated-image.png"
        width={320}
        height={320}
        hasTools
        alt="Generated image"
      />,
    );

    const previewImage = screen.getAllByAltText("Generated image")[0];
    fireEvent.load(previewImage);

    const openLightboxButton = screen.getByRole("button", {
      name: "Open image lightbox",
    });
    expect(openLightboxButton.hasAttribute("disabled")).toBe(false);

    fireEvent.click(openLightboxButton);

    const lightboxDialog = screen.getByLabelText(
      "Image lightbox",
    ) as HTMLDialogElement;
    expect(lightboxDialog.open).toBe(true);
    expect(screen.getByRole("button", { name: "Download image" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close lightbox" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close lightbox" }));

    await waitFor(() => {
      expect(lightboxDialog.open).toBe(false);
    });
  });
});
