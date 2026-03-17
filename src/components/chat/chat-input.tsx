import Image from "next/image";
import classNames from "classnames";
import { useState, ChangeEvent, useEffect, useRef, KeyboardEvent } from "react";
import { Message } from "@/types";
import { UploadRouteResponse } from "@/types/UploadData.d";
import { UploadFileInput } from "@/components/shared/upload-file-input";
import { TooltipArrow } from "@/components/shared/tooltip-arrow";

interface ChatInputProps {
  loading: boolean;
  disabled?: boolean;
  startPrompt?: string;
  personaLabel?: string;
  sendMessage: (message: Message) => void;
}

export default function ChatInput({
  loading,
  disabled = false,
  startPrompt,
  personaLabel = "AI",
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
      try {
        setIsUploading(true);
        uploadedFileUrl = await uploadSelectedFile(selectedFile);
      } catch {
        setUploadError("Failed to upload file. Please try again.");
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
    "ChatInput sticky bottom-[env(safe-area-inset-bottom)] z-20 mt-2",
    "flex w-full flex-col items-center px-3 pb-2 lg:px-5",
  );

  const chatInputWrapperClass = classNames(
    "flex w-full max-w-screen-lg items-end gap-2 rounded-xl border p-2 shadow-md",
    "border-lightBorders-500 bg-white/90 backdrop-blur",
    "dark:border-darkBorders-500 dark:bg-jwdMarine-900/90",
    disabled &&
      "border-amber-400 bg-amber-50/90 dark:border-amber-400/50 dark:bg-amber-500/10",
  );

  const promptWrapperClass = classNames(
    "relative flex flex-1 items-end gap-2 rounded-lg px-2",
    "bg-lightBackground-200 dark:bg-jwdMarine-1000",
  );

  const textareaClass = classNames(
    "mb-[0.35rem] flex min-h-11 w-full resize-none rounded-md bg-transparent py-2 text-sm leading-tight",
    "placeholder:text-sm placeholder:opacity-70",
    "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  );

  const removeFileIconClass = classNames(
    "bi bi-x absolute -right-1.5 -top-1.5 rounded-full bg-orange-600 pt-[1px]",
    "leading-none text-white shadow-sm transition-all hover:bg-amber-600",
  );

  return (
    <section className={chatInputSectionClass}>
      <div className={chatInputWrapperClass}>
        <div className={promptWrapperClass}>
          <textarea
            id="chatInput"
            name="chatInput"
            value={prompt}
            disabled={loading || disabled}
            placeholder={
              disabled ? "This conversation has ended." : "Ask Droplet..."
            }
            onChange={handlePromptChange}
            rows={2}
            className={textareaClass}
            onKeyDown={handlePromptKeyDown}
          />

          <TooltipArrow
            title={canSend ? "Send message" : "Write a message first"}
            placement="top"
          >
            <span>
              <button
                type="button"
                className="icon-btn text-base"
                disabled={!canSend}
                onClick={handleSendButtonClick}
                aria-label="Send message"
              >
                <i className="bi bi-send text-base"></i>
              </button>
            </span>
          </TooltipArrow>
        </div>

        <div className="flex w-auto">
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
                <i className="bi bi-cloud-upload text-base"></i>
              </button>
            </TooltipArrow>
          ) : previewUrl ? (
            <button
              type="button"
              className="relative flex cursor-pointer"
              onClick={handleRemoveFile}
              aria-label="Remove selected image"
            >
              <i className={removeFileIconClass}></i>
              <Image
                priority
                width={40}
                height={40}
                className="max-h-10 max-w-10 rounded-sm"
                alt="Selected image"
                src={previewUrl}
              />
            </button>
          ) : null}

          <UploadFileInput
            ref={fileInputRef}
            id="addFile"
            type="file"
            accept="image/*"
            disabled={loading || disabled}
            onChange={handleImageChange}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 py-1 text-xxs font-light tracking-wide">
        {uploadError && (
          <p
            role="alert"
            className="font-medium text-rose-600 dark:text-rose-300"
          >
            {uploadError}
          </p>
        )}
        <div className="opacity-70">
          {disabled
            ? "This conversation is read-only. Use the action above to continue."
            : isUploading
              ? "Uploading your attachment..."
              : `${personaLabel} can still make mistakes. Verify important details.`}
        </div>
      </div>
    </section>
  );
}
