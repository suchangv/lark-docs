import { BubbleMenu, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  Italic,
  Link as LinkIcon,
  Palette,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useState } from "react";

const TEXT_COLORS = [
  { label: "默认", value: "" },
  { label: "飞书蓝", value: "#3370FF" },
  { label: "红色", value: "#F54A45" },
  { label: "橙色", value: "#FF7D00" },
  { label: "绿色", value: "#00B578" },
  { label: "紫色", value: "#722ED1" },
  { label: "灰色", value: "#8F959E" },
];

const HIGHLIGHT_COLORS = [
  { label: "无高亮", value: "" },
  { label: "浅黄", value: "#FFF2A6" },
  { label: "浅蓝", value: "#D6E4FF" },
  { label: "浅绿", value: "#C6F0DC" },
  { label: "浅粉", value: "#FFD6D6" },
  { label: "浅紫", value: "#EAD6FF" },
];

export function EditorBubbleMenu({ editor }: { editor: Editor }) {
  const [showColors, setShowColors] = useState(false);

  const toggleLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("输入链接地址（留空则取消链接）:", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    }
  };

  const btnCls = (active: boolean) =>
    `flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
      active
        ? "bg-[#EBF1FF] text-[#3370FF]"
        : "text-[#1F2329] hover:bg-[#EFF0F1]"
    }`;

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, placement: "top" }}
      shouldShow={({ editor: ed, state }) => {
        if (state.selection.empty) return false;
        if (ed.isActive("codeBlock") || ed.isActive("image")) return false;
        return true;
      }}
      className="relative flex items-center gap-0.5 rounded-xl border border-[#DEE0E3] bg-white p-1 shadow-lg"
    >
      <button
        type="button"
        title="加粗 (Cmd+B)"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnCls(editor.isActive("bold"))}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="斜体 (Cmd+I)"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnCls(editor.isActive("italic"))}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="下划线 (Cmd+U)"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btnCls(editor.isActive("underline"))}
      >
        <Underline className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="删除线"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btnCls(editor.isActive("strike"))}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="行内代码"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={btnCls(editor.isActive("code"))}
      >
        <Code className="h-3.5 w-3.5" />
      </button>

      <div className="mx-0.5 h-4 w-px bg-[#DEE0E3]" />

      <button
        type="button"
        title="文字颜色 / 高亮"
        onClick={() => setShowColors((v) => !v)}
        className={btnCls(showColors || editor.isActive("highlight"))}
      >
        <Palette className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="超链接"
        onClick={toggleLink}
        className={btnCls(editor.isActive("link"))}
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </button>

      <div className="mx-0.5 h-4 w-px bg-[#DEE0E3]" />

      <button
        type="button"
        title="左对齐"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={btnCls(editor.isActive({ textAlign: "left" }))}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="居中对齐"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={btnCls(editor.isActive({ textAlign: "center" }))}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="右对齐"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={btnCls(editor.isActive({ textAlign: "right" }))}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </button>

      {showColors && (
        <div
          className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 w-56 rounded-xl border border-[#DEE0E3] bg-white p-2.5 shadow-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mb-1.5 text-[11px] font-medium text-[#8F959E]">文字颜色</div>
          <div className="mb-2.5 flex items-center gap-1.5">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                title={c.label}
                onClick={() => {
                  if (!c.value) editor.chain().focus().unsetColor().run();
                  else editor.chain().focus().setColor(c.value).run();
                  setShowColors(false);
                }}
                className="flex h-6 w-6 items-center justify-center rounded border border-[#DEE0E3] text-xs font-bold hover:scale-110 transition-transform cursor-pointer"
                style={{ color: c.value || "#1F2329" }}
              >
                A
              </button>
            ))}
          </div>
          <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-[#8F959E]">
            <Highlighter className="h-3 w-3" /> 背景高亮
          </div>
          <div className="flex items-center gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                title={c.label}
                onClick={() => {
                  if (!c.value) editor.chain().focus().unsetHighlight().run();
                  else editor.chain().focus().toggleHighlight({ color: c.value }).run();
                  setShowColors(false);
                }}
                className="h-6 w-6 rounded border border-[#DEE0E3] hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: c.value || "#FFFFFF" }}
              />
            ))}
          </div>
        </div>
      )}
    </BubbleMenu>
  );
}
