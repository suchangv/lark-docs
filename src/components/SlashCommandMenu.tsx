import type { Editor } from "@tiptap/react";
import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Lightbulb,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Table,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useVisualViewport } from "../hooks/useViewport";

export interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string;
  icon: ReactNode;
  action: (editor: Editor, range?: { from: number; to: number }) => void;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: "paragraph",
    label: "正文",
    description: "普通文本段落",
    keywords: "text paragraph p zhengwen",
    icon: <Pilcrow className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.setParagraph().run();
    },
  },
  {
    id: "h1",
    label: "一级标题",
    description: "大号章节标题",
    keywords: "h1 heading1 title bt1",
    icon: <Heading1 className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.setHeading({ level: 1 }).run();
    },
  },
  {
    id: "h2",
    label: "二级标题",
    description: "中号小节标题",
    keywords: "h2 heading2 bt2",
    icon: <Heading2 className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.setHeading({ level: 2 }).run();
    },
  },
  {
    id: "h3",
    label: "三级标题",
    description: "小号分组标题",
    keywords: "h3 heading3 bt3",
    icon: <Heading3 className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.setHeading({ level: 3 }).run();
    },
  },
  {
    id: "h4",
    label: "四级标题",
    description: "细粒度子标题",
    keywords: "h4 heading4 bt4",
    icon: <Heading4 className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.setHeading({ level: 4 }).run();
    },
  },
  {
    id: "bulletList",
    label: "无序列表",
    description: "项目符号列表",
    keywords: "ul bullet list wuxu",
    icon: <List className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.toggleBulletList().run();
    },
  },
  {
    id: "orderedList",
    label: "有序列表",
    description: "数字编号列表",
    keywords: "ol ordered list youxu",
    icon: <ListOrdered className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.toggleOrderedList().run();
    },
  },
  {
    id: "taskList",
    label: "待办清单",
    description: "可勾选的任务列表",
    keywords: "todo task checklist daiban",
    icon: <CheckSquare className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.toggleTaskList().run();
    },
  },
  {
    id: "callout",
    label: "高亮块",
    description: "带图标和彩底的提示框",
    keywords: "callout alert tip gaoliang",
    icon: <Lightbulb className="h-4 w-4 text-[#FAAD14]" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain
        .insertContent({
          type: "callout",
          attrs: { emoji: "💡", color: "blue" },
          content: [{ type: "paragraph" }],
        })
        .run();
    },
  },
  {
    id: "blockquote",
    label: "引用块",
    description: "引用一段文字或名言",
    keywords: "quote blockquote yinyong",
    icon: <Quote className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.toggleBlockquote().run();
    },
  },
  {
    id: "codeBlock",
    label: "代码块",
    description: "支持语法高亮的代码段",
    keywords: "code codeblock daima",
    icon: <Code2 className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.toggleCodeBlock().run();
    },
  },
  {
    id: "table",
    label: "表格",
    description: "插入 3×3 富文本表格",
    keywords: "table grid biaoge",
    icon: <Table className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    id: "image",
    label: "图片",
    description: "通过图片链接或粘贴插入",
    keywords: "image img photo tupian",
    icon: <ImageIcon className="h-4 w-4" />,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      const url = window.prompt("请输入图片 URL（也支持直接在编辑器中粘贴图片）:");
      if (url?.trim()) {
        editor.chain().focus().setImage({ src: url.trim() }).run();
      }
    },
  },
  {
    id: "hr",
    label: "分割线",
    description: "水平分隔线",
    keywords: "hr divider line fengexian",
    icon: <Minus className="h-4 w-4" />,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.setHorizontalRule().run();
    },
  },
];

interface SlashCommandMenuProps {
  editor: Editor;
  position: { top: number; left: number };
  query: string;
  range?: { from: number; to: number };
  onClose: () => void;
}

export function SlashCommandMenu({
  editor,
  position,
  query,
  range,
  onClose,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const vv = useVisualViewport();

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          items.length ? (prev - 1 + items.length) % items.length : 0
        );
      } else if (e.key === "Enter") {
        if (items[selectedIndex]) {
          e.preventDefault();
          items[selectedIndex].action(editor, range);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editor, items, selectedIndex, range, onClose]);

  const menuWidth = Math.min(272, Math.max(200, vv.width - 24));
  const left = Math.max(12, Math.min(position.left, vv.width - menuWidth - 12));
  const vvTop = vv.offsetTop;
  const vvBottom = vv.offsetTop + vv.height;
  const topReserve = vv.width < 768 && vv.height > 360 ? 92 : 12;
  const bottomReserve = 12;
  const spaceBelow = vvBottom - position.top - bottomReserve;
  const anchorTopOfCursor = position.top - 30;
  const spaceAbove = anchorTopOfCursor - vvTop - topReserve;
  const flipUp = spaceBelow < 200 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(120, Math.min(320, flipUp ? spaceAbove : spaceBelow));
  const top = flipUp
    ? Math.min(vvBottom - bottomReserve, Math.max(vvTop + topReserve + maxHeight, anchorTopOfCursor))
    : Math.max(vvTop + topReserve, Math.min(position.top, vvBottom - maxHeight - bottomReserve));

  return (
    <div
      ref={menuRef}
      className="fixed z-50 overflow-y-auto overscroll-contain rounded-xl border border-[#DEE0E3] bg-white p-1.5 shadow-xl"
      style={{
        width: menuWidth,
        maxHeight,
        top,
        left,
        transform: flipUp ? "translateY(-100%)" : undefined,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-medium text-[#8F959E]">
        <span>插入块 {query ? `· "${query}"` : ""}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭菜单"
          className="rounded p-1 text-[#8F959E] hover:bg-[#EFF0F1] hover:text-[#1F2329] cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {items.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-[#8F959E]">
          未找到匹配的块类型
        </div>
      ) : (
        items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              item.action(editor, range);
              onClose();
            }}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 sm:py-1.5 text-left transition-colors cursor-pointer ${
              idx === selectedIndex ? "bg-[#EBF1FF] text-[#3370FF]" : "hover:bg-[#F5F6F7] text-[#1F2329]"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                idx === selectedIndex
                  ? "border-[#BACEFD] bg-white text-[#3370FF]"
                  : "border-[#DEE0E3] bg-[#F5F6F7] text-[#646A73]"
              }`}
            >
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium leading-tight">{item.label}</div>
              <div className="truncate text-[11px] text-[#8F959E]">{item.description}</div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
