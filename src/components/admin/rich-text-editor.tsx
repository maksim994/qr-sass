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
      <div className="qrs-admin-editor-loading">
        Загрузка редактора…
      </div>
    ),
  },
);

export function RichTextEditor({ content, onChange }: Props) {
  return <CKEditorClient content={content} onChange={onChange} />;
}
