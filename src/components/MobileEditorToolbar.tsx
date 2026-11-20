import type { Editor } from "@tiptap/react";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  Check,
  CheckSquare,
  ChevronDown,
  Code,
  Copy,
  Highlighter,
  Italic,
  Layers,
  Link as LinkIcon,
  List,
  ListOrdered,
  Plus,
  Quote,
  Redo2,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MobileEditorToolbarProps {
  editor: Editor;
  onOpenSlashAt: (pos: number, coords: { top: number; left: number }) => void;
}

const HEADING_OPTIONS: ReadonlyArray<{ label: string; level: 1 | 2 | 3 | 4 | null }> = [
  { label: "正文", level: null },
  { label: "标题 1", level: 1 },
  { label: "标题 2", level: 2 },
  { label: "标题 3", level: 3 },
  { label: "标题 4", level: 4 },
];

function getTopLevelBlockInfo(editor: Editor) {
  const { doc, selection } = editor.state;
  const $from = selection.$from;
  if ($from.depth < 1) return null;

  const pos = $from.before(1);
  const node = doc.nodeAt(pos);
  if (!node) return null;

  const index = $from.index(0);
  return {
    pos,
    node,
    index,
    childCount: doc.childCount,
  };
}

export function MobileEditorToolbar({ editor, onOpenSlashAt }: MobileEditorToolbarProps) {
  const [, setTick] = useState(0);
  const [isFocused, setIsFocused] = useState(editor.isFocused);
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncState = () => {
      setTick((t) => t + 1);
      setIsFocused(editor.isFocused);
    };
    const onSelectionUpdate = () => {
      syncState();
      setHeadingMenuOpen(false);
      setBlockMenuOpen(false);
    };
    const onFocus = () => setIsFocused(true);
    const onBlur = () => {
      setIsFocused(false);
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    editor.on("selectionUpdate", onSelectionUpdate);
    editor.on("transaction", syncState);
    editor.on("focus", onFocus);
    editor.on("blur", onBlur);

    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
      editor.off("transaction", syncState);
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
    };
  }, [editor]);

  useEffect(() => {
    if (!headingMenuOpen && !blockMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setHeadingMenuOpen(false);
        setBlockMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [headingMenuOpen, blockMenuOpen]);

  const activeHeadingLevel =
    ([1, 2, 3, 4] as const).find((lvl) => editor.isActive("heading", { level: lvl })) ?? null;
  const blockLabel = activeHeadingLevel ? `H${activeHeadingLevel}` : "正文";
  const blockInfo = getTopLevelBlockInfo(editor);

  const handleOpenInsertMenu = () => {
    setHeadingMenuOpen(false);
    setBlockMenuOpen(false);

    const { $from } = editor.state.selection;
    if (
      editor.isFocused &&
      $from.parent.type.name === "paragraph" &&
      $from.parent.content.size === 0
    ) {
      const coords = editor.view.coordsAtPos($from.pos);
      onOpenSlashAt($from.pos, { top: coords.bottom + 6, left: coords.left });
      return;
    }

    const insertPos = $from.depth >= 1 ? $from.after(1) : editor.state.doc.content.size;
    editor
      .chain()
      .focus()
      .insertContentAt(insertPos, { type: "paragraph" })
      .setTextSelection(insertPos + 1)
      .run();

    const coords = editor.view.coordsAtPos(insertPos + 1);
    onOpenSlashAt(insertPos + 1, { top: coords.bottom + 6, left: coords.left });
  };

  const handleToggleLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("输入链接地址（留空则取消链接）:", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    }
  };

  const moveCurrentBlock = (direction: "up" | "down") => {
    if (!blockInfo) return;
    const { index, childCount } = blockInfo;
    if (direction === "up" && index <= 0) return;
    if (direction === "down" && index >= childCount - 1) return;

    const doc = editor.state.doc;
    const nodes: ReturnType<typeof doc.child>[] = [];
    for (let i = 0; i < childCount; i++) nodes.push(doc.child(i));

    const targetIdx = direction === "up" ? index - 1 : index + 1;
    [nodes[index], nodes[targetIdx]] = [nodes[targetIdx], nodes[index]];

    const tr = editor.state.tr;
    tr.replaceWith(0, doc.content.size, nodes);
    editor.view.dispatch(tr);
    setBlockMenuOpen(false);
  };

  const duplicateCurrentBlock = () => {
    if (!blockInfo) return;
    const insertPos = blockInfo.pos + blockInfo.node.nodeSize;
    editor.chain().focus().insertContentAt(insertPos, blockInfo.node.toJSON()).run();
    setBlockMenuOpen(false);
  };

  const deleteCurrentBlock = () => {
    if (!blockInfo) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: blockInfo.pos, to: blockInfo.pos + blockInfo.node.nodeSize })
      .run();
    setBlockMenuOpen(false);
  };

  const btnCls = (active = false, disabled = false) =>
    `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer ${
      disabled
        ? "opacity-35 pointer-events-none text-[#8F959E]"
        : active
        ? "bg-[#EBF1FF] text-[#3370FF]"
        : "text-[#1F2329] active:bg-[#EFF0F1]"
    }`;

  return (
    <div
      ref={toolbarRef}
      className="relative z-20 shrink-0 border-b border-[#EFF0F1] bg-[#FAFAFA]/95 backdrop-blur md:hidden"
    >
      {/* Heading Switcher Popover */}
      {headingMenuOpen && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full left-3 mt-1.5 z-40 w-40 rounded-xl border border-[#DEE0E3] bg-white p-1.5 shadow-xl"
        >
          {HEADING_OPTIONS.map((opt) => {
            const selected =
              opt.level === null
                ? activeHeadingLevel === null && editor.isActive("paragraph")
                : activeHeadingLevel === opt.level;
            return (
              <button
                key={opt.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (opt.level === null) {
                    editor.chain().focus().setParagraph().run();
                  } else {
                    editor.chain().focus().setHeading({ level: opt.level }).run();
                  }
                  setHeadingMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer ${
                  selected ? "bg-[#EBF1FF] text-[#3370FF]" : "text-[#1F2329] active:bg-[#F5F6F7]"
                }`}
              >
                <span>{opt.label}</span>
                {selected && <Check className="h-3.5 w-3.5 text-[#3370FF]" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Block Operations Popover */}
      {blockMenuOpen && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full right-3 mt-1.5 z-40 w-40 rounded-xl border border-[#DEE0E3] bg-white p-1.5 shadow-xl"
        >
          <button
            type="button"
            disabled={!blockInfo || blockInfo.index <= 0}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => moveCurrentBlock("up")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#1F2329] active:bg-[#F5F6F7] disabled:opacity-40 cursor-pointer"
          >
            <ArrowUp className="h-3.5 w-3.5 text-[#646A73]" /> 上移块
          </button>
          <button
            type="button"
            disabled={!blockInfo || blockInfo.index >= blockInfo.childCount - 1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => moveCurrentBlock("down")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#1F2329] active:bg-[#F5F6F7] disabled:opacity-40 cursor-pointer"
          >
            <ArrowDown className="h-3.5 w-3.5 text-[#646A73]" /> 下移块
          </button>
          <button
            type="button"
            disabled={!blockInfo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={duplicateCurrentBlock}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#1F2329] active:bg-[#F5F6F7] disabled:opacity-40 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 text-[#646A73]" /> 复制块
          </button>
          <div className="my-1 h-px bg-[#EFF0F1]" />
          <button
            type="button"
            disabled={!blockInfo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={deleteCurrentBlock}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#F54A45] active:bg-[#FFF0F0] disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" /> 删除块
          </button>
        </div>
      )}

      <div className="flex h-10 items-center px-1.5">
        {/* Pinned Insert Block Button */}
        <button
          type="button"
          title="插入块"
          aria-label="插入块"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleOpenInsertMenu}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EBF1FF] text-[#3370FF] active:bg-[#D6E4FF] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-px shrink-0 bg-[#DEE0E3]" />

        {/* Horizontally Scrollable Formatting Strip */}
        <div className="flex flex-1 items-center gap-0.5 overflow-x-auto no-scrollbar px-0.5">
          <button
            type="button"
            title="撤销"
            aria-label="撤销"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().undo().run()}
            className={btnCls(false, !editor.can().undo())}
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="重做"
            aria-label="重做"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().redo().run()}
            className={btnCls(false, !editor.can().redo())}
          >
            <Redo2 className="h-4 w-4" />
          </button>

          <div className="mx-0.5 h-4 w-px shrink-0 bg-[#DEE0E3]" />

          <button
            type="button"
            title="切换标题样式"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setHeadingMenuOpen((v) => !v);
              setBlockMenuOpen(false);
            }}
            className={`flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold cursor-pointer ${
              headingMenuOpen || activeHeadingLevel
                ? "bg-[#EBF1FF] text-[#3370FF]"
                : "text-[#1F2329] active:bg-[#EFF0F1]"
            }`}
          >
            <span>{blockLabel}</span>
          </button>

          <button
            type="button"
            title="加粗"
            aria-label="加粗"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={btnCls(editor.isActive("bold"))}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="斜体"
            aria-label="斜体"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={btnCls(editor.isActive("italic"))}
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="下划线"
            aria-label="下划线"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={btnCls(editor.isActive("underline"))}
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="删除线"
            aria-label="删除线"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={btnCls(editor.isActive("strike"))}
          >
            <Strikethrough className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="行内代码"
            aria-label="行内代码"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={btnCls(editor.isActive("code"))}
          >
            <Code className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="背景高亮"
            aria-label="背景高亮"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHighlight({ color: "#FFF2A6" }).run()}
            className={btnCls(editor.isActive("highlight"))}
          >
            <Highlighter className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="超链接"
            aria-label="超链接"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleToggleLink}
            className={btnCls(editor.isActive("link"))}
          >
            <LinkIcon className="h-4 w-4" />
          </button>

          <div className="mx-0.5 h-4 w-px shrink-0 bg-[#DEE0E3]" />

          <button
            type="button"
            title="无序列表"
            aria-label="无序列表"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={btnCls(editor.isActive("bulletList"))}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="有序列表"
            aria-label="有序列表"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={btnCls(editor.isActive("orderedList"))}
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="待办清单"
            aria-label="待办清单"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={btnCls(editor.isActive("taskList"))}
          >
            <CheckSquare className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="引用块"
            aria-label="引用块"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={btnCls(editor.isActive("blockquote"))}
          >
            <Quote className="h-4 w-4" />
          </button>

          <div className="mx-0.5 h-4 w-px shrink-0 bg-[#DEE0E3]" />

          <button
            type="button"
            title="当前块操作"
            aria-label="当前块操作"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setBlockMenuOpen((v) => !v);
              setHeadingMenuOpen(false);
            }}
            className={btnCls(blockMenuOpen)}
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>

        {/* Dismiss Keyboard Button */}
        {isFocused && (
          <>
            <div className="mx-1 h-4 w-px shrink-0 bg-[#DEE0E3]" />
            <button
              type="button"
              title="收起键盘"
              aria-label="收起键盘"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.commands.blur()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#646A73] active:bg-[#EFF0F1] cursor-pointer"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
