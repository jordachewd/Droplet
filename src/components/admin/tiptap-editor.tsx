"use client";

import classNames from "classnames";
import { EditorContent, useEditor } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import FormInput from "@/components/shared/form-input";
import Button from "@/components/shared/Button";

interface TiptapEditorProps {
  inputName: string;
  initialContent: string;
}

export default function TiptapEditor({
  inputName,
  initialContent,
}: TiptapEditorProps) {
  const [html, setHtml] = useState(initialContent);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        allowBase64: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor: updatedEditor }) => {
      setHtml(updatedEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.commands.setContent(initialContent);
  }, [editor, initialContent]);

  function normalizeUrl(rawValue: string): string {
    const trimmedUrl = rawValue.trim();
    if (!trimmedUrl) {
      return "";
    }

    if (
      trimmedUrl.startsWith("/") ||
      trimmedUrl.startsWith("http://") ||
      trimmedUrl.startsWith("https://")
    ) {
      return trimmedUrl;
    }

    return `https://${trimmedUrl}`;
  }

  function handleToggleBold() {
    editor?.chain().focus().toggleBold().run();
  }

  function handleToggleItalic() {
    editor?.chain().focus().toggleItalic().run();
  }

  function handleToggleUnderline() {
    editor?.chain().focus().toggleUnderline().run();
  }

  function handleToggleStrike() {
    editor?.chain().focus().toggleStrike().run();
  }

  function handleAlignLeft() {
    editor?.chain().focus().setTextAlign("left").run();
  }

  function handleAlignCenter() {
    editor?.chain().focus().setTextAlign("center").run();
  }

  function handleAlignRight() {
    editor?.chain().focus().setTextAlign("right").run();
  }

  function handleAlignJustify() {
    editor?.chain().focus().setTextAlign("justify").run();
  }

  function handleToggleBulletList() {
    editor?.chain().focus().toggleBulletList().run();
  }

  function handleToggleOrderedList() {
    editor?.chain().focus().toggleOrderedList().run();
  }

  function handleApplyLink() {
    if (!editor) {
      return;
    }

    const normalizedLinkUrl = normalizeUrl(linkUrl);

    if (!normalizedLinkUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalizedLinkUrl })
      .run();
  }

  function handleRemoveLink() {
    editor?.chain().focus().unsetLink().run();
    setLinkUrl("");
  }

  function handleApplyImage() {
    if (!editor) {
      return;
    }

    const normalizedImageUrl = normalizeUrl(imageUrl);

    if (!normalizedImageUrl) {
      return;
    }

    if (editor.isActive("image")) {
      editor
        .chain()
        .focus()
        .updateAttributes("image", {
          src: normalizedImageUrl,
          alt: imageAlt.trim(),
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .setImage({
          src: normalizedImageUrl,
          alt: imageAlt.trim(),
        })
        .run();
    }
  }

  function handleRemoveImage() {
    editor?.chain().focus().deleteSelection().run();
  }

  return (
    <div className="TiptapEditor flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-start">
        <Button
          type="button"
          variant={editor?.isActive("bold") ? "contained" : "outlined"}
          size="xs"
          onClick={handleToggleBold}
        >
          Bold
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("italic") ? "contained" : "outlined"}
          size="xs"
          onClick={handleToggleItalic}
        >
          Italic
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("underline") ? "contained" : "outlined"}
          size="xs"
          onClick={handleToggleUnderline}
        >
          Underline
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("strike") ? "contained" : "outlined"}
          size="xs"
          onClick={handleToggleStrike}
        >
          Strike
        </Button>
        <Button
          type="button"
          variant={
            editor?.isActive({ textAlign: "left" }) ? "contained" : "outlined"
          }
          size="xs"
          onClick={handleAlignLeft}
        >
          Left
        </Button>
        <Button
          type="button"
          variant={
            editor?.isActive({ textAlign: "center" }) ? "contained" : "outlined"
          }
          size="xs"
          onClick={handleAlignCenter}
        >
          Center
        </Button>
        <Button
          type="button"
          variant={
            editor?.isActive({ textAlign: "right" }) ? "contained" : "outlined"
          }
          size="xs"
          onClick={handleAlignRight}
        >
          Right
        </Button>
        <Button
          type="button"
          variant={
            editor?.isActive({ textAlign: "justify" })
              ? "contained"
              : "outlined"
          }
          size="xs"
          onClick={handleAlignJustify}
        >
          Justify
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("bulletList") ? "contained" : "outlined"}
          size="xs"
          onClick={handleToggleBulletList}
        >
          Bullets
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("orderedList") ? "contained" : "outlined"}
          size="xs"
          onClick={handleToggleOrderedList}
        >
          Numbered
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-400/80 bg-lavenderHaze-100/60 p-3 dark:border-slate-500 dark:bg-nightIndigo-1000/60">
          <div className="grid grid-cols-1 gap-2">
            <FormInput
              type="url"
              label="Link URL"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outlined"
                size="xs"
                onClick={handleApplyLink}
              >
                Set Link
              </Button>
              <Button
                type="button"
                variant="outlined"
                size="xs"
                onClick={handleRemoveLink}
              >
                Remove Link
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-400/80 bg-lavenderHaze-100/60 p-3 dark:border-slate-500 dark:bg-nightIndigo-1000/60">
          <div className="grid grid-cols-1 gap-2">
            <FormInput
              type="url"
              label="Image URL"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://cdn.example.com/image.png"
            />
            <FormInput
              type="text"
              label="Image Alt Text"
              value={imageAlt}
              onChange={(event) => setImageAlt(event.target.value)}
              placeholder="Describe the image"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outlined"
                size="xs"
                onClick={handleApplyImage}
              >
                Insert / Update Image
              </Button>
              <Button
                type="button"
                variant="outlined"
                size="xs"
                onClick={handleRemoveImage}
              >
                Remove Selected Image
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={classNames(
          "form-text-input min-h-80 px-4 py-3",
          "[&_.ProseMirror]:min-h-72 [&_.ProseMirror]:outline-none",
          "[&_.ProseMirror]:prose [&_.ProseMirror]:max-w-none",
          "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ol]:list-decimal",
          "[&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:pl-5",
          "[&_.ProseMirror_a]:text-twilightPurple-600 [&_.ProseMirror_a]:underline",
          "[&_.ProseMirror_img]:my-2 [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg",
        )}
      >
        <EditorContent editor={editor} />
      </div>

      <input type="hidden" name={inputName} value={html} readOnly />
    </div>
  );
}
