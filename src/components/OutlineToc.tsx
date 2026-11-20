import { PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { OutlineItem } from "../types";

export interface OutlineTreeNode extends OutlineItem {
  children: OutlineTreeNode[];
}

export function buildOutlineTree(items: OutlineItem[]): OutlineTreeNode[] {
  const roots: OutlineTreeNode[] = [];
  const stack: OutlineTreeNode[] = [];

  for (const item of items) {
    const node: OutlineTreeNode = { ...item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return roots;
}

interface OutlineTocProps {
  docId: string;
  items: OutlineItem[];
  activeId: string | null;
  onSelect: (item: OutlineItem) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

function OutlineTreeList({
  nodes,
  depth,
  activeId,
  touch,
  onSelect,
}: {
  nodes: OutlineTreeNode[];
  depth: number;
  activeId: string | null;
  touch: boolean;
  onSelect: (item: OutlineItem) => void;
}) {
  return (
    <ul
      role={depth === 0 ? "tree" : "group"}
      className={depth === 0 ? "space-y-0.5" : "relative ml-[10.5px] pl-3.5"}
    >
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1;
        const isActive = node.id === activeId;
        const hasChildren = node.children.length > 0;

        return (
          <li
            key={node.id}
            role="treeitem"
            aria-expanded={hasChildren ? true : undefined}
            className={`relative ${depth > 0 && !isLast ? "pb-0.5" : ""}`}
          >
            {depth > 0 && !isLast && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-[#DEE0E3]"
              />
            )}

            {depth > 0 && (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-0 top-0 w-3 rounded-bl-[5px] border-b border-l border-[#DEE0E3] ${
                  touch ? "h-[18px]" : "h-[14px]"
                }`}
              />
            )}

            <button
              type="button"
              onClick={() => onSelect(node)}
              title={node.text || "无标题章节"}
              className={`group flex w-full items-center gap-2 rounded-md px-2 text-left leading-5 transition-colors cursor-pointer select-none ${
                touch ? "py-2 text-[13.5px]" : "py-1 text-[12.5px]"
              } ${
                isActive
                  ? "bg-[#EBF1FF] font-medium text-[#3370FF]"
                  : depth === 0
                  ? "font-medium text-[#1F2329] hover:bg-[#EFF0F1]"
                  : "text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`shrink-0 rounded-full transition-colors ${
                  depth === 0 ? "h-1.5 w-1.5" : "h-[5px] w-[5px]"
                } ${
                  isActive
                    ? "bg-[#3370FF]"
                    : depth === 0
                    ? "bg-[#8F959E] group-hover:bg-[#646A73]"
                    : "bg-[#C9CDD4] group-hover:bg-[#8F959E]"
                }`}
              />
              <span className="min-w-0 flex-1 truncate">
                {node.text || "无标题章节"}
              </span>
            </button>

            {hasChildren && (
              <div className="pt-0.5">
                <OutlineTreeList
                  nodes={node.children}
                  depth={depth + 1}
                  activeId={activeId}
                  touch={touch}
                  onSelect={onSelect}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function OutlineToc({
  docId,
  items,
  activeId,
  onSelect,
  mobileOpen,
  onMobileOpenChange,
}: OutlineTocProps) {
  // Always default to expanded on desktop; collapsed is session/page-local only
  const [collapsed, setCollapsed] = useState(false);

  const tree = useMemo(() => buildOutlineTree(items), [items]);

  // Reset desktop collapse state when switching documents
  useEffect(() => {
    setCollapsed(false);
  }, [docId]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onMobileOpenChange]);

  const handleMobileSelect = (item: OutlineItem) => {
    onSelect(item);
    onMobileOpenChange(false);
  };

  return (
    <>
      {/* Desktop (>=1024px): expanded by default, single button when collapsed */}
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="展开大纲"
          aria-label="展开大纲"
          className="hidden lg:flex absolute right-6 top-6 z-20 h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-[#646A73] shadow-lg backdrop-blur hover:bg-[#EFF0F1] hover:text-[#1F2329] transition-colors cursor-pointer"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      ) : (
        <aside
          aria-label="大纲"
          className="hidden lg:flex absolute right-6 top-6 z-20 w-64 max-h-[72vh] flex-col rounded-xl bg-white/95 shadow-lg backdrop-blur"
        >
          <div className="flex h-10 shrink-0 items-center justify-between px-3.5 pt-1">
            <span className="text-[13px] font-medium text-[#1F2329]">大纲</span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="收起大纲"
              aria-label="收起大纲"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329] transition-colors cursor-pointer"
            >
              <PanelRightClose className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2.5 pt-0.5">
            {tree.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-xs text-[#8F959E]">暂无大纲</p>
              </div>
            ) : (
              <nav aria-label="文档大纲">
                <OutlineTreeList
                  nodes={tree}
                  depth={0}
                  activeId={activeId}
                  touch={false}
                  onSelect={onSelect}
                />
              </nav>
            )}
          </div>
        </aside>
      )}

      {/* Mobile / Narrow (<1024px): Bottom Sheet controlled from TopHeader */}
      {mobileOpen && (
        <>
          <div
            onClick={() => onMobileOpenChange(false)}
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] lg:hidden"
          />
          <aside
            aria-label="文档大纲"
            className="safe-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[72dvh] flex-col rounded-t-2xl bg-white shadow-2xl lg:hidden"
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-1 w-9 rounded-full bg-[#DEE0E3]" />
            </div>
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#EFF0F1] px-4">
              <span className="text-sm font-semibold text-[#1F2329]">文档大纲</span>
              <button
                type="button"
                onClick={() => onMobileOpenChange(false)}
                title="关闭大纲"
                aria-label="关闭大纲"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
              {tree.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-[#8F959E]">暂无大纲，添加标题后将在此展示</p>
                </div>
              ) : (
                <nav aria-label="文档大纲">
                  <OutlineTreeList
                    nodes={tree}
                    depth={0}
                    activeId={activeId}
                    touch={true}
                    onSelect={handleMobileSelect}
                  />
                </nav>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
