import { BubbleMenu, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Code,
  Highlighter,
  Italic,
  Link as LinkIcon,
  Palette,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const BLOCK_TYPES: ReadonlyArray<{
  label: string;
  level: HeadingLevel | null;
  itemClass: string;
}> = [
  { label: "正文", level: null, itemClass: "text-[13px] font-normal" },
  { label: "标题1", level: 1, itemClass: "text-[16px] font-bold" },
  { label: "标题2", level: 2, itemClass: "text-[15px] font-semibold" },
  { label: "标题3", level: 3, itemClass: "text-[14px] font-semibold" },
  { label: "标题4", level: 4, itemClass: "text-[13.5px] font-semibold" },
  { label: "标题5", level: 5, itemClass: "text-[13px] font-semibold" },
  { label: "标题6", level: 6, itemClass: "text-[12.5px] font-semibold" },
];

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
  const [showBlockTypes, setShowBlockTypes] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowBlockTypes(false);
        setShowColors(false);
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, []);

  useEffect(() => {
    const closePopovers = () => {
      setShowBlockTypes(false);
      setShowColors(false);
    };
    editor.on("selectionUpdate", closePopovers);
    return () => {
      editor.off("selectionUpdate", closePopovers);
    };
  }, [editor]);

  const activeHeadingLevel: HeadingLevel | null =
    ([1, 2, 3, 4, 5, 6] as const).find((lvl) =>
      editor.isActive("heading", { level: lvl })
    ) ?? null;
  const currentBlockLabel = activeHeadingLevel ? `标题${activeHeadingLevel}` : "正文";

  const selectBlockType = (level: HeadingLevel | null) => {
    if (level === null) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().setHeading({ level }).run();
    }
    setShowBlockTypes(false);
  };

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
      tippyOptions={{ duration: 120, placement: "top", zIndex: 50 }}
      shouldShow={({ editor: ed, state }) => {
        if (state.selection.empty) return false;
        if (ed.isActive("codeBlock") || ed.isActive("image")) return false;
        return true;
      }}
      className="relative"
    >
      <div
        ref={menuRef}
        className="relative flex items-center gap-0.5 rounded-xl border border-[#DEE0E3] bg-white p-1 shadow-lg"
      >
        <div className="relative">
          <button
            type="button"
            title="文本样式"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowBlockTypes((v) => !v);
              setShowColors(false);
            }}
            className={`flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              showBlockTypes
                ? "bg-[#EBF1FF] text-[#3370FF]"
                : "text-[#1F2329] hover:bg-[#EFF0F1]"
            }`}
          >
            <span>{currentBlockLabel}</span>
            <ChevronDown className="h-3 w-3 text-[#646A73]" />
          </button>

          {showBlockTypes && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              className="absolute left-0 top-full z-50 mt-2 w-36 rounded-xl border border-[#DEE0E3] bg-white p-1 shadow-xl"
            >
              {BLOCK_TYPES.map((item) => {
                const isSelected =
                  item.level === null
                    ? activeHeadingLevel === null && editor.isActive("paragraph")
                    : activeHeadingLevel === item.level;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => selectBlockType(item.level)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#EBF1FF] text-[#3370FF]"
                        : "text-[#1F2329] hover:bg-[#EFF0F1]"
                    }`}
                  >
                    <span className={item.itemClass}>{item.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#3370FF]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mx-0.5 h-4 w-px bg-[#DEE0E3]" />

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
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setShowColors((v) => !v);
          setShowBlockTypes(false);
        }}
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
      </div>
    </BubbleMenu>
  );
}
