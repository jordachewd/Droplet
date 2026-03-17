"use client";

import { useEffect, useState } from "react";

interface TiptapEditorProps {
  inputName: string;
  initialContent: string;
}

export default function TiptapEditor({
  inputName,
  initialContent,
}: TiptapEditorProps) {
  const [html, setHtml] = useState(initialContent);

  useEffect(() => {
    setHtml(initialContent);
  }, [initialContent]);

  function applySimpleFormat(tag: "strong" | "em" | "ul") {
    if (tag === "ul") {
      setHtml((previous) => `${previous}\n<ul>\n  <li></li>\n</ul>`);
      return;
    }

    setHtml((previous) => `${previous}<${tag}></${tag}>`);
  }

  return (
    <div className="TiptapEditor flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm btn-outlined"
          onClick={() => applySimpleFormat("strong")}
        >
          Bold
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outlined"
          onClick={() => applySimpleFormat("em")}
        >
          Italic
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outlined"
          onClick={() => applySimpleFormat("ul")}
        >
          Bullets
        </button>
      </div>

      <div className="min-h-80 rounded-2xl border border-lightBorders-400 bg-lightBackground-100 px-4 py-3 dark:border-darkBorders-500 dark:bg-jwdMarine-1000">
        <textarea
          className="h-80 w-full resize-y bg-transparent text-sm outline-none"
          value={html}
          onChange={(event) => setHtml(event.target.value)}
          aria-label="Website page content"
        />
      </div>

      <input type="hidden" name={inputName} value={html} readOnly />
    </div>
  );
}
