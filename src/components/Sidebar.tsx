import {
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Home,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Doc, DocTreeNode, ViewMode } from "../types";

interface SidebarProps {
  open: boolean;
  isMobile: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (w: number) => void;
  tree: DocTreeNode[];
  activeDocId: string | null;
  viewMode: ViewMode;
  onSelectView: (mode: ViewMode) => void;
  onSelectDoc: (id: string) => void;
  onCreateDoc: (parentId: string | null) => void;
  onRenameDoc: (doc: Doc) => void;
  onDuplicateDoc: (id: string) => void;
  onToggleFavorite: (doc: Doc) => void;
  onDeleteDoc: (id: string) => void;
  onOpenSearch: () => void;
  onOpenTrash: () => void;
  trashOpen?: boolean;
}

function TreeNodeItem({
  node,
  depth,
  isMobile,
  activeDocId,
  viewMode,
  expandedIds,
  toggleExpand,
  onSelectDoc,
  onCreateDoc,
  onRenameDoc,
  onDuplicateDoc,
  onToggleFavorite,
  onDeleteDoc,
}: {
  node: DocTreeNode;
  depth: number;
  isMobile: boolean;
  activeDocId: string | null;
  viewMode: ViewMode;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onSelectDoc: (id: string) => void;
  onCreateDoc: (parentId: string | null) => void;
  onRenameDoc: (doc: Doc) => void;
  onDuplicateDoc: (id: string) => void;
  onToggleFavorite: (doc: Doc) => void;
  onDeleteDoc: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuOpenUp, setMenuOpenUp] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isActive = viewMode === "doc" && activeDocId === node.id;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  const indentPx = isMobile ? 8 + Math.min(depth, 4) * 12 : 8 + depth * 14;

  return (
    <div>
      <div
        className={`group relative flex items-center gap-1 rounded-lg pr-1.5 py-2 md:py-1 text-[14px] md:text-[13.5px] transition-colors cursor-pointer select-none ${
          isActive
            ? "bg-[#EBF1FF] text-[#3370FF] font-medium"
            : "text-[#1F2329] hover:bg-[#EFF0F1] active:bg-[#E5E6EB]"
        }`}
        style={{ paddingLeft: `${indentPx}px` }}
        onClick={() => onSelectDoc(node.id)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(node.id);
          }}
          className={`flex h-6 w-6 md:h-5 md:w-5 shrink-0 items-center justify-center rounded hover:bg-black/5 ${
            hasChildren ? "text-[#8F959E]" : "opacity-0 pointer-events-none"
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        <span className="shrink-0 text-sm leading-none">
          {node.emoji || <FileText className="h-4 w-4 text-[#8F959E]" />}
        </span>

        <span className="min-w-0 flex-1 truncate pl-1">
          {node.title || "无标题文档"}
        </span>

        <div
          className={`flex items-center gap-0.5 ${
            isMobile || menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          } transition-opacity`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="新建子文档"
            onClick={() => {
              if (!isExpanded && hasChildren) toggleExpand(node.id);
              onCreateDoc(node.id);
            }}
            className="flex h-7 w-7 md:h-6 md:w-6 items-center justify-center rounded text-[#646A73] hover:bg-black/8 hover:text-[#1F2329] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              title="更多操作"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuOpenUp(window.innerHeight - rect.bottom < 180);
                setMenuOpen((v) => !v);
              }}
              className="flex h-7 w-7 md:h-6 md:w-6 items-center justify-center rounded text-[#646A73] hover:bg-black/8 hover:text-[#1F2329] cursor-pointer"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div
                className={`absolute right-0 ${
                  menuOpenUp ? "bottom-8" : "top-8 md:top-7"
                } z-50 w-40 rounded-xl border border-[#DEE0E3] bg-white p-1 shadow-xl text-[#1F2329]`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onRenameDoc(node);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 md:py-1.5 text-xs hover:bg-[#F5F6F7] cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5 text-[#646A73]" /> 重命名
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicateDoc(node.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 md:py-1.5 text-xs hover:bg-[#F5F6F7] cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-[#646A73]" /> 创建副本
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleFavorite(node);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 md:py-1.5 text-xs hover:bg-[#F5F6F7] cursor-pointer"
                >
                  <Star
                    className={`h-3.5 w-3.5 ${
                      node.isFavorite ? "fill-[#FAAD14] text-[#FAAD14]" : "text-[#646A73]"
                    }`}
                  />
                  {node.isFavorite ? "取消收藏" : "添加到收藏"}
                </button>
                <div className="my-1 h-px bg-[#EFF0F1]" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteDoc(node.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 md:py-1.5 text-xs text-[#F54A45] hover:bg-[#FFF0F0] cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> 移入回收站
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              isMobile={isMobile}
              activeDocId={activeDocId}
              viewMode={viewMode}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onSelectDoc={onSelectDoc}
              onCreateDoc={onCreateDoc}
              onRenameDoc={onRenameDoc}
              onDuplicateDoc={onDuplicateDoc}
              onToggleFavorite={onToggleFavorite}
              onDeleteDoc={onDeleteDoc}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  open,
  isMobile,
  onClose,
  width,
  onWidthChange,
  tree,
  activeDocId,
  viewMode,
  onSelectView,
  onSelectDoc,
  onCreateDoc,
  onRenameDoc,
  onDuplicateDoc,
  onToggleFavorite,
  onDeleteDoc,
  onOpenSearch,
  onOpenTrash,
  trashOpen = false,
}: SidebarProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(["welcome-lark-docs"])
  );

  useEffect(() => {
    if (!isMobile || !open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, open, onClose]);

  useEffect(() => {
    if (!activeDocId) return;
    const findAncestors = (nodes: DocTreeNode[], targetId: string, path: string[]): string[] | null => {
      for (const n of nodes) {
        if (n.id === targetId) return path;
        const found = findAncestors(n.children, targetId, [...path, n.id]);
        if (found) return found;
      }
      return null;
    };
    const ancestors = findAncestors(tree, activeDocId, []);
    if (ancestors && ancestors.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const id of ancestors) {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [activeDocId, tree]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(420, Math.max(220, startW + (ev.clientX - startX)));
      onWidthChange(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  if (!isMobile && !open) return null;

  const navBtn = (active: boolean) =>
    `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 md:py-1.5 text-[14px] md:text-[13.5px] transition-colors cursor-pointer ${
      active
        ? "bg-[#EBF1FF] text-[#3370FF] font-medium"
        : "text-[#1F2329] hover:bg-[#EFF0F1] active:bg-[#E5E6EB]"
    }`;

  const asideContent = (
    <aside
      aria-hidden={isMobile ? !open : undefined}
      className={
        isMobile
          ? `fixed inset-y-0 left-0 z-50 flex h-dvh w-[82vw] max-w-[300px] flex-col border-r border-[#DEE0E3] bg-[#F5F6F7] shadow-2xl select-none safe-top safe-bottom transition-transform duration-200 ease-out ${
              open ? "translate-x-0" : "-translate-x-full pointer-events-none"
            }`
          : "relative flex h-full shrink-0 flex-col border-r border-[#DEE0E3] bg-[#F5F6F7] select-none"
      }
      style={isMobile ? undefined : { width }}
    >
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3370FF] text-white font-bold text-sm shadow-sm">
            L
          </div>
          <div>
            <div className="text-[14px] font-semibold leading-tight text-[#1F2329]">
              Lark Docs
            </div>
            <div className="text-[11px] text-[#8F959E]">个人知识库</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCreateDoc(null)}
            title="新建文档"
            className="flex h-8 w-8 md:h-7 md:w-7 items-center justify-center rounded-lg bg-white border border-[#DEE0E3] text-[#1F2329] hover:border-[#3370FF] hover:text-[#3370FF] transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="h-4 w-4" />
          </button>
          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              title="关闭侧边栏"
              aria-label="关闭侧边栏"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Trigger */}
      <div className="px-3 py-1.5">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex w-full items-center justify-between rounded-lg border border-[#DEE0E3] bg-white px-2.5 py-2 md:py-1.5 text-xs text-[#8F959E] hover:border-[#3370FF]/50 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />
            搜索文档...
          </span>
          <kbd className="hidden md:inline-block rounded bg-[#F5F6F7] px-1.5 py-0.5 font-mono text-[10px] text-[#8F959E]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Quick Links */}
      <div className="px-2.5 py-1.5 space-y-0.5">
        <button
          type="button"
          onClick={() => onSelectView("home")}
          className={navBtn(viewMode === "home")}
        >
          <Home className="h-4 w-4 text-[#646A73]" />
          主页
        </button>
        <button
          type="button"
          onClick={() => onSelectView("recent")}
          className={navBtn(viewMode === "recent")}
        >
          <Clock className="h-4 w-4 text-[#646A73]" />
          最近编辑
        </button>
        <button
          type="button"
          onClick={() => onSelectView("favorites")}
          className={navBtn(viewMode === "favorites")}
        >
          <Star className="h-4 w-4 text-[#646A73]" />
          收藏夹
        </button>
      </div>

      {/* Document Tree */}
      <div className="mt-2 flex items-center justify-between px-4 py-1">
        <span className="text-[11px] font-semibold text-[#8F959E] uppercase tracking-wider">
          我的文档
        </span>
        <button
          type="button"
          onClick={() => onCreateDoc(null)}
          title="新建根文档"
          className="rounded p-1 md:p-0.5 text-[#8F959E] hover:bg-[#EFF0F1] hover:text-[#1F2329] cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-1 space-y-0.5">
        {tree.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            isMobile={isMobile}
            activeDocId={activeDocId}
            viewMode={viewMode}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            onSelectDoc={onSelectDoc}
            onCreateDoc={onCreateDoc}
            onRenameDoc={onRenameDoc}
            onDuplicateDoc={onDuplicateDoc}
            onToggleFavorite={onToggleFavorite}
            onDeleteDoc={onDeleteDoc}
          />
        ))}
      </div>

      {/* Bottom Trash */}
      <div className="border-t border-[#DEE0E3] p-2.5">
        <button
          type="button"
          onClick={onOpenTrash}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 md:py-1.5 text-[13.5px] md:text-[13px] transition-colors cursor-pointer ${
            trashOpen
              ? "bg-[#EBF1FF] text-[#3370FF] font-medium"
              : "text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329]"
          }`}
        >
          <Trash2 className="h-4 w-4" />
          回收站
        </button>
      </div>

      {/* Resize Handle (Desktop only) */}
      {!isMobile && (
        <div
          onMouseDown={startResize}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#3370FF]/40 transition-colors"
        />
      )}
    </aside>
  );

  if (!isMobile) return asideContent;

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      {asideContent}
    </>
  );
}
