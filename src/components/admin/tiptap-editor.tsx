"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface TiptapEditorProps {
  inputName: string;
  initialContent: string;
}

export default function TiptapEditor({
  inputName,
  initialContent,
}: TiptapEditorProps) {
  const [html, setHtml] = useState(initialContent);
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      setHtml(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    setHtml(initialContent);
    editor?.commands.setContent(initialContent);
  }, [editor, initialContent]);

  return (
    <div className="TiptapEditor flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm btn-outlined"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          aria-pressed={editor?.isActive("bold") ?? false}
        >
          Bold
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outlined"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          aria-pressed={editor?.isActive("italic") ?? false}
        >
          Italic
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outlined"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          aria-pressed={editor?.isActive("bulletList") ?? false}
        >
          Bullets
        </button>
      </div>

      <div className="min-h-80 rounded-2xl border border-lightBorders-400 bg-white px-4 py-3 dark:border-darkBorders-500 dark:bg-jwdMarine-1000">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="text-sm opacity-60">Loading editor...</div>
        )}
      </div>

      <input type="hidden" name={inputName} value={html} readOnly />
    </div>
  );
}
