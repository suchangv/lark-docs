import { ChevronRight, PanelRightClose, PanelRightOpen } from "lucide-react";
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
}

function OutlineTreeItem({
  node,
  depth,
  activeId,
  expandedIds,
  onToggleExpand,
  onSelect,
}: {
  node: OutlineTreeNode;
  depth: number;
  activeId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (item: OutlineItem) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isActive = node.id === activeId;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(node);
          }
        }}
        style={{ paddingLeft: `${6 + depth * 12}px` }}
        title={node.text || "无标题章节"}
        className={`group flex items-center gap-1 rounded-md py-1 pr-2 text-[12.5px] leading-5 transition-colors cursor-pointer select-none ${
          isActive
            ? "bg-[#EBF1FF] font-medium text-[#3370FF]"
            : "text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329]"
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={isExpanded ? "收起子标题" : "展开子标题"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[#8F959E] hover:bg-[#DEE0E3]/60 hover:text-[#1F2329] cursor-pointer"
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-150 ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span className="truncate">{node.text || "无标题章节"}</span>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <OutlineTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OutlineToc({ docId, items, activeId, onSelect }: OutlineTocProps) {
  // Always default to expanded; collapsed is session/page-local only (never persisted)
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const tree = useMemo(() => buildOutlineTree(items), [items]);

  const ancestorMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const walk = (nodes: OutlineTreeNode[], ancestors: string[]) => {
      for (const node of nodes) {
        map.set(node.id, ancestors);
        if (node.children.length > 0) {
          walk(node.children, [...ancestors, node.id]);
        }
      }
    };
    walk(tree, []);
    return map;
  }, [tree]);

  // Reset outline state when switching documents (always expanded by default, children collapsed)
  useEffect(() => {
    setCollapsed(false);
    setMobileOpen(false);
    setExpandedIds(new Set());
  }, [docId]);

  // Auto-expand collapsed ancestors when active heading changes
  useEffect(() => {
    if (!activeId) return;
    const ancestors = ancestorMap.get(activeId);
    if (!ancestors || ancestors.length === 0) return;

    setExpandedIds((prev) => {
      const hasMissing = ancestors.some((id) => !prev.has(id));
      if (!hasMissing) return prev;
      const next = new Set(prev);
      for (const id of ancestors) {
        next.add(id);
      }
      return next;
    });
  }, [activeId, ancestorMap]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderPanel = (onCollapse: () => void, visibilityClass: string) => (
    <aside
      aria-label="大纲"
      className={`${visibilityClass} absolute right-6 top-6 z-20 w-60 max-h-[70vh] flex-col rounded-xl bg-white/95 shadow-lg backdrop-blur`}
    >
      <div className="flex h-10 shrink-0 items-center justify-between px-3.5 pt-1">
        <span className="text-[13px] font-medium text-[#1F2329]">大纲</span>
        <button
          type="button"
          onClick={onCollapse}
          title="收起大纲"
          aria-label="收起大纲"
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329] transition-colors cursor-pointer"
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2.5 pt-0.5">
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-xs text-[#8F959E]">暂无大纲</p>
          </div>
        ) : (
          <nav aria-label="文档大纲" className="space-y-0.5">
            {tree.map((node) => (
              <OutlineTreeItem
                key={node.id}
                node={node}
                depth={0}
                activeId={activeId}
                expandedIds={expandedIds}
                onToggleExpand={toggleExpand}
                onSelect={onSelect}
              />
            ))}
          </nav>
        )}
      </div>
    </aside>
  );

  const renderExpandButton = (onExpand: () => void, visibilityClass: string) => (
    <button
      type="button"
      onClick={onExpand}
      title="展开大纲"
      aria-label="展开大纲"
      className={`${visibilityClass} absolute right-6 top-6 z-20 h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-[#646A73] shadow-lg backdrop-blur hover:bg-[#EFF0F1] hover:text-[#1F2329] transition-colors cursor-pointer`}
    >
      <PanelRightOpen className="h-4 w-4" />
    </button>
  );

  return (
    <>
      {/* Desktop (>=1024px): expanded by default, single button when collapsed */}
      {collapsed
        ? renderExpandButton(() => setCollapsed(false), "hidden lg:flex")
        : renderPanel(() => setCollapsed(true), "hidden lg:flex")}

      {/* Narrow screens (<1024px): hidden by default to avoid covering content, button always clickable */}
      {mobileOpen
        ? renderPanel(() => setMobileOpen(false), "flex lg:hidden")
        : renderExpandButton(() => setMobileOpen(true), "flex lg:hidden")}
    </>
  );
}
