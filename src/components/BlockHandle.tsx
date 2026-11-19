import type { Editor } from "@tiptap/react";
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BlockHandleProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onOpenSlashAt: (pos: number, coords: { top: number; left: number }) => void;
}

export function BlockHandle({ editor, containerRef, onOpenSlashAt }: BlockHandleProps) {
  const [hovered, setHovered] = useState<{
    top: number;
    pos: number;
    nodeIndex: number;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (menuOpen) return;
      const pm = container.querySelector(".ProseMirror");
      if (!pm) return;

      const children = Array.from(pm.children) as HTMLElement[];
      const containerRect = container.getBoundingClientRect();

      let matchedIdx = -1;
      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        if (e.clientY >= rect.top - 4 && e.clientY <= rect.bottom + 4) {
          matchedIdx = i;
          break;
        }
      }

      if (matchedIdx !== -1) {
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
        const targetEl = children[matchedIdx];
        const rect = targetEl.getBoundingClientRect();
        try {
          const domPos = editor.view.posAtDOM(targetEl, 0);
          const resolved = editor.state.doc.resolve(Math.max(0, domPos));
          const blockPos = resolved.before(1);
          setHovered({
            top: rect.top - containerRect.top + 2,
            pos: blockPos,
            nodeIndex: matchedIdx,
          });
        } catch {
          // ignore transient DOM mismatch
        }
      }
    };

    const handleMouseLeave = () => {
      if (menuOpen) return;
      hideTimer.current = window.setTimeout(() => setHovered(null), 180);
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [editor, containerRef, menuOpen]);

  if (!hovered) return null;

  const doc = editor.state.doc;
  const childCount = doc.childCount;

  const insertBlockBelow = () => {
    const node = doc.nodeAt(hovered.pos);
    if (!node) return;
    const insertPos = hovered.pos + node.nodeSize;
    editor
      .chain()
      .focus()
      .insertContentAt(insertPos, { type: "paragraph" })
      .setTextSelection(insertPos + 1)
      .run();

    const coords = editor.view.coordsAtPos(insertPos + 1);
    onOpenSlashAt(insertPos + 1, { top: coords.bottom + 6, left: coords.left });
    setMenuOpen(false);
  };

  const deleteBlock = () => {
    const node = doc.nodeAt(hovered.pos);
    if (!node) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: hovered.pos, to: hovered.pos + node.nodeSize })
      .run();
    setMenuOpen(false);
    setHovered(null);
  };

  const duplicateBlock = () => {
    const node = doc.nodeAt(hovered.pos);
    if (!node) return;
    const insertPos = hovered.pos + node.nodeSize;
    editor.chain().focus().insertContentAt(insertPos, node.toJSON()).run();
    setMenuOpen(false);
  };

  const moveBlock = (direction: "up" | "down") => {
    const idx = hovered.nodeIndex;
    if (direction === "up" && idx <= 0) return;
    if (direction === "down" && idx >= childCount - 1) return;

    const nodes: ReturnType<typeof doc.child>[] = [];
    for (let i = 0; i < childCount; i++) nodes.push(doc.child(i));

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    [nodes[idx], nodes[targetIdx]] = [nodes[targetIdx], nodes[idx]];

    const tr = editor.state.tr;
    tr.replaceWith(0, doc.content.size, nodes);
    editor.view.dispatch(tr);
    setMenuOpen(false);
  };

  return (
    <div
      className="absolute -left-13 z-20 flex items-center gap-0.5 select-none"
      style={{ top: hovered.top }}
      onMouseEnter={() => {
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
      }}
    >
      <button
        type="button"
        title="在下方插入块"
        onClick={insertBlockBelow}
        className="flex h-6 w-6 items-center justify-center rounded text-[#8F959E] hover:bg-[#EFF0F1] hover:text-[#1F2329] transition-colors cursor-pointer"
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="relative">
        <button
          type="button"
          title="块操作"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-6 w-5 items-center justify-center rounded text-[#8F959E] hover:bg-[#EFF0F1] hover:text-[#1F2329] transition-colors cursor-pointer"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-7 z-40 w-36 rounded-xl border border-[#DEE0E3] bg-white p-1 shadow-xl">
            <button
              type="button"
              disabled={hovered.nodeIndex <= 0}
              onClick={() => moveBlock("up")}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[#1F2329] hover:bg-[#F5F6F7] disabled:opacity-40 cursor-pointer"
            >
              <ArrowUp className="h-3.5 w-3.5 text-[#646A73]" /> 上移
            </button>
            <button
              type="button"
              disabled={hovered.nodeIndex >= childCount - 1}
              onClick={() => moveBlock("down")}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[#1F2329] hover:bg-[#F5F6F7] disabled:opacity-40 cursor-pointer"
            >
              <ArrowDown className="h-3.5 w-3.5 text-[#646A73]" /> 下移
            </button>
            <button
              type="button"
              onClick={duplicateBlock}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[#1F2329] hover:bg-[#F5F6F7] cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-[#646A73]" /> 复制块
            </button>
            <div className="my-1 h-px bg-[#EFF0F1]" />
            <button
              type="button"
              onClick={deleteBlock}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[#F54A45] hover:bg-[#FFF0F0] cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> 删除块
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
