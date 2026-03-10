import Image from "next/image";
import classNames from "classnames";
import { useState, ChangeEvent, useEffect, useRef, KeyboardEvent } from "react";
import { Message } from "@/types";
import { UploadFileInput } from "@/components/shared/upload-file-input";
import { TooltipArrow } from "@/components/shared/tooltip-arrow";

interface ChatInputProps {
  loading: boolean;
  startPrompt?: string;
  personaLabel?: string;
  sendMessage: (message: Message) => void;
}

export default function ChatInput({
  loading,
  startPrompt,
  personaLabel = "AI",
  sendMessage,
}: ChatInputProps) {
  const [prompt, setPrompt] = useState<string>(startPrompt || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasPrompt = prompt.trim() !== "";
  const canSend = (hasPrompt || Boolean(selectedFile)) && !loading;

  const convertToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  useEffect(() => {
    if (!selectedFile) {
      setFileUrl(null);
      return;
    }

    convertToBase64(selectedFile).then((url) => setFileUrl(url));
  }, [selectedFile]);

  useEffect(() => {
    if (typeof startPrompt === "string") {
      setPrompt(startPrompt);
    }
  }, [startPrompt]);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  }

  function handleOpenFilePicker() {
    if (loading) return;
    fileInputRef.current?.click();
  }

  function handlePromptChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(event.target.value);
  }

  async function handleSubmit() {
    if (!canSend) return;

    const content: Message["content"] = [
      {
        type: "text",
        text: prompt.trim(),
      },
    ];

    if (selectedFile) {
      const base64Image = await convertToBase64(selectedFile);
      content.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${base64Image}` },
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
  }

  function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null);
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
            disabled={loading}
            placeholder="Ask Droplet..."
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
                  "cursor-not-allowed opacity-50": loading,
                })}
                onClick={handleOpenFilePicker}
                aria-label="Attach media"
                disabled={loading}
              >
                <i className="bi bi-cloud-upload text-base"></i>
              </button>
            </TooltipArrow>
          ) : fileUrl ? (
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
                className="max-h-[40px] max-w-[40px] rounded-sm"
                alt="Selected image"
                src={`data:image/jpeg;base64,${fileUrl}`}
              />
            </button>
          ) : null}

          <UploadFileInput
            ref={fileInputRef}
            id="addFile"
            type="file"
            accept="image/*"
            disabled={loading}
            onChange={handleImageChange}
          />
        </div>
      </div>

      <div className="flex py-1 text-xxs font-light tracking-wide opacity-70">
        {personaLabel} can still make mistakes. Verify important details.
      </div>
    </section>
  );
}
