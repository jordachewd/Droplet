import Image from "next/image";
import classNames from "classnames";
import { useState, ChangeEvent, useEffect, useRef, KeyboardEvent } from "react";
import { Message } from "@/types";
import { UploadRouteResponse } from "@/types/UploadData.d";
import { UploadFileInput } from "@/components/shared/upload-file-input";
import { TooltipArrow } from "@/components/shared/tooltip-arrow";
import DropletGlobe from "../shared/droplet-globe";

interface ChatInputProps {
  loading: boolean;
  disabled?: boolean;
  startPrompt?: string;
  personaLabel?: string;
  placeholder?: string;
  sendMessage: (message: Message) => void;
}

const ALLOWED_IMAGE_UPLOAD_MIME_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_IMAGE_UPLOAD_ACCEPT_VALUE =
  "image/jpeg,image/png,image/webp,image/gif";
const INVALID_IMAGE_UPLOAD_TYPE_MESSAGE =
  "Invalid file type. Allowed types: image/jpeg, image/png, image/webp, image/gif.";

function validateSelectedImageFile(file: File | null): string | null {
  if (!file) {
    return null;
  }

  if (!ALLOWED_IMAGE_UPLOAD_MIME_TYPES.has(file.type)) {
    return INVALID_IMAGE_UPLOAD_TYPE_MESSAGE;
  }

  return null;
}

export default function ChatInput({
  loading,
  disabled = false,
  startPrompt,
  personaLabel = "Droplet",
  placeholder = "Ask Droplet...",
  sendMessage,
}: ChatInputProps) {
  const [prompt, setPrompt] = useState<string>(startPrompt || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasPrompt = prompt.trim() !== "";
  const canSend =
    (hasPrompt || Boolean(selectedFile)) &&
    !loading &&
    !disabled &&
    !isUploading;

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (typeof startPrompt === "string") {
      setPrompt(startPrompt);
    }
  }, [startPrompt]);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setUploadError(null);

    const fileValidationError = validateSelectedImageFile(file);
    if (fileValidationError) {
      setSelectedFile(null);
      setUploadError(fileValidationError);
      e.currentTarget.value = "";
      return;
    }

    setSelectedFile(file);
  }

  function handleOpenFilePicker() {
    if (loading || disabled || isUploading) return;
    fileInputRef.current?.click();
  }

  function handlePromptChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(event.target.value);
  }

  async function uploadSelectedFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response
      .json()
      .catch(() => null)) as UploadRouteResponse | null;
    const responseMessage =
      payload?.error ||
      payload?.message ||
      "Failed to upload the selected file.";

    if (!response.ok || !payload?.fileUrl) {
      throw new Error(responseMessage);
    }

    return payload.fileUrl;
  }

  async function handleSubmit() {
    if (!canSend) return;

    const content: Message["content"] = [
      {
        type: "text",
        text: prompt.trim(),
      },
    ];

    setUploadError(null);
    let uploadedFileUrl: string | null = null;

    if (selectedFile) {
      const fileValidationError = validateSelectedImageFile(selectedFile);
      if (fileValidationError) {
        setUploadError(fileValidationError);
        setSelectedFile(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      try {
        setIsUploading(true);
        uploadedFileUrl = await uploadSelectedFile(selectedFile);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to upload file. Please try again.";
        setUploadError(message);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    if (uploadedFileUrl) {
      content.push({
        type: "image_url",
        image_url: { url: uploadedFileUrl },
      });
    }

    const message: Message = {
      whois: "user",
      role: "user",
      content,
    };

    sendMessage(message);
    setPrompt("");
    setSelectedFile(null);
    setUploadError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    setUploadError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSendButtonClick() {
    void handleSubmit();
  }

  const chatInputSectionClass = classNames(
    "ChatInput sticky bottom-[env(safe-area-inset-bottom)] z-20",
    "flex w-full flex-col items-center gap-1 max-w-4xl mx-auto",
  );

  const chatInputWrapperClass = classNames(
    "ChatInputPrompt flex flex-col w-full gap-2 rounded-xl",
    "bg-lavenderHaze-100/90 dark:border shadow-md p-1.5",
    "dark:border-midnightBlue-300/10 dark:bg-nightIndigo-900/90",
    disabled &&
      "border-amber-400 bg-amber-50/90 dark:border-amber-400/50 dark:bg-amber-500/10",
  );

  const promptWrapperClass = classNames("flex w-full gap-2");

  const textareaClass = classNames(
    "flex min-h-11 w-full resize-none bg-lavenderHaze-500 rounded-md p-2 text-sm leading-tight",
    "placeholder:text-sm placeholder:text-midnightBlue-500/50 dark:placeholder:text-lavenderHaze-500/50",
    "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-nightIndigo-400/10",
  );

  const removeFileIconClass = classNames(
    "bi bi-x absolute -right-1.5 -top-1.5 rounded-full bg-orange-600 pt-[1px]",
    "leading-none text-white shadow-sm transition-all hover:bg-amber-600",
  );

  return (
    <div className={chatInputSectionClass}>
      <div className={chatInputWrapperClass}>
        <div className={promptWrapperClass}>
          <textarea
            id="chatInput"
            name="chatInput"
            value={prompt}
            disabled={loading || disabled}
            placeholder={
              disabled ? "This conversation has ended." : placeholder
            }
            onChange={handlePromptChange}
            rows={2}
            className={textareaClass}
            onKeyDown={handlePromptKeyDown}
            aria-label="Message input"
          />

          <TooltipArrow
            title={canSend ? "Send message" : "Write a message first"}
            placement="top"
          >
            <button
              type="button"
              className="px-2"
              disabled={!canSend}
              onClick={handleSendButtonClick}
              aria-label="Send message"
            >
              <DropletGlobe icon="bi-stars" size={38} />
            </button>
          </TooltipArrow>
        </div>

        <div className="flex w-full">
          {!selectedFile ? (
            <TooltipArrow title="Attach media" placement="top">
              <button
                type="button"
                className={classNames("icon-btn text-base", {
                  "cursor-not-allowed opacity-50":
                    loading || disabled || isUploading,
                })}
                onClick={handleOpenFilePicker}
                aria-label="Attach media"
                disabled={loading || disabled || isUploading}
              >
                <i
                  className="bi bi-cloud-upload text-base"
                  aria-hidden="true"
                ></i>
              </button>
            </TooltipArrow>
          ) : previewUrl ? (
            <button
              type="button"
              className="relative flex cursor-pointer"
              onClick={handleRemoveFile}
              aria-label="Remove selected image"
            >
              <i className={removeFileIconClass} aria-hidden="true"></i>
              <Image
                priority
                width={40}
                height={40}
                className="max-h-10 max-w-10 rounded-sm"
                alt="Preview of selected image"
                src={previewUrl}
              />
            </button>
          ) : null}

          <UploadFileInput
            ref={fileInputRef}
            id="addFile"
            type="file"
            accept={ALLOWED_IMAGE_UPLOAD_ACCEPT_VALUE}
            disabled={loading || disabled}
            onChange={handleImageChange}
          />
        </div>
      </div>

      <div className="ChatInputFooter flex flex-col items-center gap-1 pt-1 pb-2 px-4 text-xxs font-light tracking-wide">
        {uploadError ? (
          <p
            role="alert"
            className="font-medium text-rose-600 dark:text-rose-300"
          >
            {uploadError}
          </p>
        ) : (
          <div className="text-midnightBlue-600 dark:text-lavenderHaze-600">
            {disabled
              ? "This conversation is read-only. Use the action above to continue."
              : isUploading
                ? "Uploading your attachment..."
                : `${personaLabel} can still make mistakes. Verify important details.`}
          </div>
        )}
      </div>
    </div>
  );
}
