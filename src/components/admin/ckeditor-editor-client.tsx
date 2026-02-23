"use client";

import { useEffect } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";

function useCKEditorStyles() {
  useEffect(() => {
    if (document.getElementById("ckeditor5-styles")) return;
    const link = document.createElement("link");
    link.id = "ckeditor5-styles";
    link.rel = "stylesheet";
    link.href = "/ckeditor5.css";
    document.head.appendChild(link);
  }, []);
}

import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  Link,
  List,
  BlockQuote,
  HtmlEmbed,
  Table,
} from "ckeditor5";

type Props = {
  content: string;
  onChange: (html: string) => void;
};

const config = {
  licenseKey: "GPL",
  plugins: [
    Essentials,
    Paragraph,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Heading,
    Link,
    List,
    BlockQuote,
    HtmlEmbed,
    Table,
  ],
  toolbar: [
    "undo",
    "redo",
    "|",
    "heading",
    "|",
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "|",
    "link",
    "|",
    "bulletedList",
    "numberedList",
    "blockQuote",
    "|",
    "insertTable",
    "htmlEmbed",
  ],
  heading: {
    options: [
      { model: "paragraph" as const, title: "Текст", class: "ck-heading_paragraph" },
      { model: "heading2" as const, view: "h2", title: "Заголовок 2", class: "ck-heading_heading2" },
      { model: "heading3" as const, view: "h3", title: "Заголовок 3", class: "ck-heading_heading3" },
    ],
  },
  language: "ru",
};

export function CKEditorClient({ content, onChange }: Props) {
  useCKEditorStyles();
  return (
    <div className="ckeditor-wrapper [&_.ck-editor__editable]:min-h-[280px]">
      <CKEditor
        editor={ClassicEditor}
        config={config}
        data={content}
        onChange={(_evt, editor) => onChange(editor.getData())}
      />
    </div>
  );
}
