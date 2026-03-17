declare module "@tiptap/react" {
  import type { ReactNode } from "react";

  export interface TiptapEditorInstance {
    getHTML: () => string;
    commands: {
      setContent: (content: string) => void;
    };
    chain: () => {
      focus: () => {
        toggleBold: () => { run: () => boolean };
        toggleItalic: () => { run: () => boolean };
        toggleBulletList: () => { run: () => boolean };
      };
    };
    isActive: (name: string) => boolean;
  }

  export function useEditor(options: {
    extensions?: unknown[];
    content?: string;
    immediatelyRender?: boolean;
    onUpdate?: (params: { editor: TiptapEditorInstance }) => void;
  }): TiptapEditorInstance | null;

  export function EditorContent(props: {
    editor: TiptapEditorInstance;
    children?: ReactNode;
  }): ReactNode;
}

declare module "@tiptap/starter-kit" {
  const StarterKit: unknown;
  export default StarterKit;
}
