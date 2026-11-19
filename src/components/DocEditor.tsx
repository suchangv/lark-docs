import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, ReactNodeViewRenderer, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { Image as ImageIcon, Smile, Table as TableIcon, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Callout } from "../extensions/Callout";
import { CodeBlockComponent } from "../extensions/CodeBlockComponent";
import type { Doc, OutlineItem } from "../types";
import { countWords, formatRelativeTime } from "../utils/docTree";
import { BlockHandle } from "./BlockHandle";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { COVER_PRESETS, CoverPicker, EmojiPicker } from "./EmojiCoverPickers";
import { OutlineToc } from "./OutlineToc";
import { SlashCommandMenu } from "./SlashCommandMenu";

const lowlight = createLowlight(common);

interface DocEditorProps {
  doc: Doc;
  wideMode: boolean;
  onChangeDoc: (
    docId: string,
    patch: Partial<Pick<Doc, "title" | "emoji" | "cover" | "content" | "wordCount">>
  ) => void;
  onEditorReady?: (editor: Editor | null) => void;
}

export function DocEditor({
  doc,
  wideMode,
  onChangeDoc,
  onEditorReady,
}: DocEditorProps) {
  const [title, setTitle] = useState(doc.title);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [slashState, setSlashState] = useState<{
    open: boolean;
    position: { top: number; left: number };
    query: string;
    range?: { from: number; to: number };
  }>({ open: false, position: { top: 0, left: 0 }, query: "" });
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const docIdRef = useRef(doc.id);
  docIdRef.current = doc.id;
  const outlineRef = useRef<OutlineItem[]>([]);
  const outlineTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const parsedContent = (() => {
    if (!doc.content) return { type: "doc", content: [{ type: "paragraph" }] };
    try {
      return JSON.parse(doc.content);
    } catch {
      return doc.content;
    }
  })();

  const extractOutline = useCallback((ed: Editor) => {
    const items: OutlineItem[] = [];
    ed.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        const level = Number(node.attrs.level ?? 1);
        if (level >= 1 && level <= 4) {
          items.push({
            id: `heading-${pos}`,
            level,
            text: node.textContent,
            pos,
          });
        }
      }
    });

    const prev = outlineRef.current;
    const unchanged =
      prev.length === items.length &&
      prev.every(
        (item, idx) =>
          item.id === items[idx].id &&
          item.level === items[idx].level &&
          item.text === items[idx].text &&
          item.pos === items[idx].pos
      );
    if (unchanged) return;

    outlineRef.current = items;
    setOutline(items);
  }, []);

  const scheduleOutlineExtract = useCallback(
    (ed: Editor) => {
      if (outlineTimerRef.current !== null) {
        window.clearTimeout(outlineTimerRef.current);
      }
      outlineTimerRef.current = window.setTimeout(() => {
        outlineTimerRef.current = null;
        extractOutline(ed);
      }, 180);
    },
    [extractOutline]
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: { levels: [1, 2, 3, 4] },
        }),
        Placeholder.configure({
          placeholder: ({ node }) =>
            node.type.name === "heading"
              ? "输入标题..."
              : "输入 / 唤起命令菜单，或直接开始写作...",
        }),
        Underline,
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Link.configure({
          openOnClick: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow" },
        }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Image.configure({ inline: false, allowBase64: true }),
        CodeBlockLowlight.extend({
          addNodeView() {
            return ReactNodeViewRenderer(CodeBlockComponent);
          },
        }).configure({ lowlight }),
        Callout,
      ],
      content: parsedContent,
      editorProps: {
        handlePaste(view, event) {
          const items = event.clipboardData?.items;
          if (!items) return false;
          for (const item of Array.from(items)) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile();
              if (!file) continue;
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string") {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: reader.result })
                    )
                  );
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
          return false;
        },
      },
      onCreate({ editor: ed }) {
        extractOutline(ed);
      },
      onUpdate({ editor: ed }) {
        scheduleOutlineExtract(ed);

        // Slash command detection
        const { selection } = ed.state;
        if (selection.empty) {
          const $from = selection.$from;
          const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
          const match = textBefore.match(/(?:^|\s)\/([^\s/]*)$/);
          if (match) {
            const slashStart = $from.pos - match[1].length - 1;
            const coords = ed.view.coordsAtPos($from.pos);
            setSlashState({
              open: true,
              position: { top: coords.bottom + 6, left: coords.left },
              query: match[1],
              range: { from: slashStart, to: $from.pos },
            });
          } else {
            setSlashState((prev) => (prev.open ? { ...prev, open: false } : prev));
          }
        } else {
          setSlashState((prev) => (prev.open ? { ...prev, open: false } : prev));
        }

        const jsonStr = JSON.stringify(ed.getJSON());
        const words = countWords(ed.getText());
        onChangeDoc(docIdRef.current, { content: jsonStr, wordCount: words });
      },
    },
    [doc.id]
  );

  useEffect(() => {
    setTitle(doc.title);
    setEmojiPickerOpen(false);
    setCoverPickerOpen(false);
    setSlashState((prev) => ({ ...prev, open: false }));
    return () => {
      if (outlineTimerRef.current !== null) {
        window.clearTimeout(outlineTimerRef.current);
        outlineTimerRef.current = null;
      }
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
    };
  }, [doc.id, doc.title]);

  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  // Track active heading on scroll (per-frame via requestAnimationFrame)
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller || !editor) return;

    let rafId: number | null = null;

    const updateActiveHeading = () => {
      rafId = null;
      const headings = Array.from(
        scroller.querySelectorAll(".ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4")
      ) as HTMLElement[];
      const scrollerTop = scroller.getBoundingClientRect().top;
      let currentId: string | null = outline[0]?.id ?? null;

      headings.forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        if (rect.top - scrollerTop <= 140 && outline[idx]) {
          currentId = outline[idx].id;
        }
      });
      setActiveHeadingId(currentId);
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateActiveHeading);
    };

    updateActiveHeading();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [editor, outline]);

  const scrollToHeading = (item: OutlineItem) => {
    if (!editor) return;
    try {
      const domInfo = editor.view.domAtPos(item.pos + 1);
      const rawEl =
        domInfo.node instanceof HTMLElement
          ? domInfo.node
          : domInfo.node.parentElement;
      const headingEl = rawEl?.closest("h1, h2, h3, h4") as HTMLElement | null;
      const targetEl = headingEl ?? rawEl;
      targetEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveHeadingId(item.id);

      if (targetEl) {
        if (highlightTimerRef.current !== null) {
          window.clearTimeout(highlightTimerRef.current);
        }
        targetEl.style.transition = "background-color 0.25s ease";
        targetEl.style.backgroundColor = "#EBF1FF";
        targetEl.style.borderRadius = "6px";
        highlightTimerRef.current = window.setTimeout(() => {
          targetEl.style.backgroundColor = "";
          highlightTimerRef.current = null;
        }, 1100);
      }
    } catch {
      editor.chain().focus().setTextSelection(item.pos + 1).run();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-white">
      <div
        ref={scrollContainerRef}
        className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white"
      >
      {/* Cover Banner */}
      {doc.cover && (
        <div
          className="group/cover relative h-44 w-full shrink-0"
          style={{ background: doc.cover }}
        >
          <div className="absolute right-6 bottom-3 flex items-center gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity">
            <div className="relative">
              <button
                type="button"
                onClick={() => setCoverPickerOpen((v) => !v)}
                className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-[#1F2329] shadow-sm hover:bg-white cursor-pointer"
              >
                更换封面
              </button>
              {coverPickerOpen && (
                <CoverPicker
                  onSelect={(cover) => onChangeDoc(doc.id, { cover })}
                  onRemove={() => onChangeDoc(doc.id, { cover: null })}
                  onClose={() => setCoverPickerOpen(false)}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => onChangeDoc(doc.id, { cover: null })}
              className="rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-[#F54A45] shadow-sm hover:bg-white cursor-pointer"
            >
              移除
            </button>
          </div>
        </div>
      )}

      {/* Main Document Container */}
      <div
        className={`mx-auto px-14 sm:px-20 pb-32 transition-all duration-200 ${
          wideMode ? "max-w-6xl" : "max-w-3xl"
        } ${doc.cover ? "pt-6" : "pt-14"}`}
      >
        {/* Document Header (Hover actions + Emoji + Title) */}
        <div className="group/header relative mb-6">
          {/* Hover Quick Add Bar */}
          <div className="mb-2 flex items-center gap-2 opacity-0 group-hover/header:opacity-100 transition-opacity">
            <div className="relative">
              <button
                type="button"
                onClick={() => setEmojiPickerOpen((v) => !v)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329] cursor-pointer"
              >
                <Smile className="h-3.5 w-3.5" />
                {doc.emoji ? "更换图标" : "添加图标"}
              </button>
              {emojiPickerOpen && !doc.emoji && (
                <EmojiPicker
                  onSelect={(emoji) => onChangeDoc(doc.id, { emoji })}
                  onRemove={() => onChangeDoc(doc.id, { emoji: null })}
                  onClose={() => setEmojiPickerOpen(false)}
                />
              )}
            </div>

            {!doc.cover && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    onChangeDoc(doc.id, { cover: COVER_PRESETS[0].value })
                  }
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329] cursor-pointer"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  添加封面
                </button>
              </div>
            )}
          </div>

          {/* Emoji + Title */}
          <div className="flex items-start gap-3">
            {doc.emoji && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setEmojiPickerOpen((v) => !v)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-4xl hover:bg-[#F5F6F7] transition-colors cursor-pointer"
                  title="更换图标"
                >
                  {doc.emoji}
                </button>
                {emojiPickerOpen && (
                  <EmojiPicker
                    onSelect={(emoji) => onChangeDoc(doc.id, { emoji })}
                    onRemove={() => onChangeDoc(doc.id, { emoji: null })}
                    onClose={() => setEmojiPickerOpen(false)}
                  />
                )}
              </div>
            )}

            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                onChangeDoc(doc.id, { title: e.target.value });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  editor?.commands.focus("start");
                }
              }}
              placeholder="无标题文档"
              className="w-full bg-transparent text-[32px] font-bold leading-tight tracking-tight text-[#1F2329] placeholder-[#C9CDD4] outline-none"
            />
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-[#8F959E]">
            <span>{doc.wordCount} 字</span>
            <span>·</span>
            <span>更新于 {formatRelativeTime(doc.updatedAt)}</span>
          </div>
        </div>

        {/* Table Quick Toolbar */}
        {editor && editor.isActive("table") && (
          <div className="mb-3 flex flex-wrap items-center gap-1 rounded-lg border border-[#DEE0E3] bg-[#F5F6F7] px-2.5 py-1.5 text-xs text-[#1F2329]">
            <TableIcon className="mr-1 h-3.5 w-3.5 text-[#3370FF]" />
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="rounded px-2 py-0.5 hover:bg-white cursor-pointer"
            >
              + 行
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="rounded px-2 py-0.5 hover:bg-white cursor-pointer"
            >
              - 行
            </button>
            <div className="mx-1 h-3 w-px bg-[#DEE0E3]" />
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="rounded px-2 py-0.5 hover:bg-white cursor-pointer"
            >
              + 列
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="rounded px-2 py-0.5 hover:bg-white cursor-pointer"
            >
              - 列
            </button>
            <div className="mx-1 h-3 w-px bg-[#DEE0E3]" />
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[#F54A45] hover:bg-[#FFF0F0] cursor-pointer"
            >
              <Trash2 className="h-3 w-3" /> 删除表格
            </button>
          </div>
        )}

        {/* Editor Area */}
        <div ref={editorWrapperRef} className="lark-editor relative">
          {editor && <EditorBubbleMenu editor={editor} />}
          {editor && (
            <BlockHandle
              editor={editor}
              containerRef={editorWrapperRef}
              onOpenSlashAt={(pos, coords) =>
                setSlashState({
                  open: true,
                  position: coords,
                  query: "",
                  range: { from: pos, to: pos },
                })
              }
            />
          )}
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Slash Command Menu */}
      {editor && slashState.open && (
        <SlashCommandMenu
          editor={editor}
          position={slashState.position}
          query={slashState.query}
          range={slashState.range}
          onClose={() => setSlashState((prev) => ({ ...prev, open: false }))}
        />
      )}
      </div>

      {/* Right Tree Outline TOC */}
      <OutlineToc
        docId={doc.id}
        items={outline}
        activeId={activeHeadingId}
        onSelect={scrollToHeading}
      />
    </div>
  );
}
