"use client";

import { useEffect, useState } from "react";
import Button from "@/components/shared/button";

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
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={() => applySimpleFormat("strong")}
        >
          Bold
        </Button>
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={() => applySimpleFormat("em")}
        >
          Italic
        </Button>
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={() => applySimpleFormat("ul")}
        >
          Bullets
        </Button>
      </div>

      <div className="min-h-80 rounded-2xl border border-slate-400 bg-lavenderHaze-100 px-4 py-3 dark:border-slate-500 dark:bg-nightIndigo-1000">
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
