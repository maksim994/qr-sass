"use client";

import dynamic from "next/dynamic";

type Props = {
  content: string;
  onChange: (html: string) => void;
};

const CKEditorClient = dynamic(
  () =>
    import("./ckeditor-editor-client").then((mod) => mod.CKEditorClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
        Загрузка редактора…
      </div>
    ),
  },
);

export function RichTextEditor({ content, onChange }: Props) {
  return <CKEditorClient content={content} onChange={onChange} />;
}
