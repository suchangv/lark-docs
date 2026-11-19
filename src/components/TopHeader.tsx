import {
  Check,
  ChevronRight,
  Cloud,
  Download,
  Info,
  Loader2,
  LogOut,
  Maximize2,
  Minimize2,
  PanelLeft,
  Star,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Doc, SaveStatus, UserInfo, ViewMode } from "../types";

interface TopHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  breadcrumbs: Doc[];
  activeDoc: Doc | null;
  viewMode: ViewMode;
  saveStatus: SaveStatus;
  wideMode: boolean;
  onToggleWideMode: () => void;
  onSelectDoc: (id: string) => void;
  onToggleFavorite: (doc: Doc) => void;
  onExportMarkdown: () => void;
  onExportHtml: () => void;
  user: UserInfo | null;
}

export function TopHeader({
  sidebarOpen,
  onToggleSidebar,
  breadcrumbs,
  activeDoc,
  viewMode,
  saveStatus,
  wideMode,
  onToggleWideMode,
  onSelectDoc,
  onToggleFavorite,
  onExportMarkdown,
  onExportHtml,
  user,
}: TopHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setInfoOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const viewTitle =
    viewMode === "home"
      ? "主页"
      : viewMode === "recent"
      ? "最近编辑"
      : viewMode === "favorites"
      ? "收藏夹"
      : null;

  const userInitial = user?.email ? user.email[0].toUpperCase() : "U";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#DEE0E3] bg-white px-3.5">
      {/* Left: Sidebar toggle + Breadcrumbs + Save status */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "收起侧边栏" : "展开侧边栏"}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329] transition-colors cursor-pointer"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {viewTitle ? (
          <span className="text-sm font-medium text-[#1F2329]">{viewTitle}</span>
        ) : (
          <nav className="flex min-w-0 items-center gap-1 text-[13px]">
            {breadcrumbs.map((b, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div key={b.id} className="flex min-w-0 items-center gap-1">
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#8F959E]" />}
                  <button
                    type="button"
                    onClick={() => onSelectDoc(b.id)}
                    className={`flex max-w-44 items-center gap-1 truncate rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                      isLast
                        ? "font-medium text-[#1F2329]"
                        : "text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329]"
                    }`}
                  >
                    {b.emoji && <span>{b.emoji}</span>}
                    <span className="truncate">{b.title || "无标题文档"}</span>
                  </button>
                </div>
              );
            })}
          </nav>
        )}

        {viewMode === "doc" && activeDoc && (
          <div className="ml-2 hidden sm:flex items-center gap-1 text-xs text-[#8F959E]">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3370FF]" />
                <span>保存中...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Cloud className="h-3.5 w-3.5 text-[#00B578]" />
                <span>已保存</span>
              </>
            )}
            {saveStatus === "error" && (
              <span className="text-[#F54A45]">保存失败，请检查网络</span>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-1">
        {viewMode === "doc" && activeDoc && (
          <>
            <button
              type="button"
              onClick={() => onToggleFavorite(activeDoc)}
              title={activeDoc.isFavorite ? "取消收藏" : "收藏文档"}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#646A73] hover:bg-[#EFF0F1] cursor-pointer"
            >
              <Star
                className={`h-4 w-4 ${
                  activeDoc.isFavorite ? "fill-[#FAAD14] text-[#FAAD14]" : ""
                }`}
              />
            </button>

            <button
              type="button"
              onClick={onToggleWideMode}
              title={wideMode ? "切换标准页宽" : "切换宽屏模式"}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#646A73] hover:bg-[#EFF0F1] cursor-pointer"
            >
              {wideMode ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                title="导出文档"
                className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden md:inline">导出</span>
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-9 z-40 w-44 rounded-xl border border-[#DEE0E3] bg-white p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      onExportMarkdown();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs text-[#1F2329] hover:bg-[#F5F6F7] cursor-pointer"
                  >
                    <span>导出 Markdown</span>
                    <span className="text-[10px] text-[#8F959E]">.md</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      onExportHtml();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs text-[#1F2329] hover:bg-[#F5F6F7] cursor-pointer"
                  >
                    <span>导出 HTML</span>
                    <span className="text-[10px] text-[#8F959E]">.html</span>
                  </button>
                </div>
              )}
            </div>

            {/* Doc Info */}
            <div className="relative" ref={infoRef}>
              <button
                type="button"
                onClick={() => setInfoOpen((v) => !v)}
                title="文档信息"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#646A73] hover:bg-[#EFF0F1] cursor-pointer"
              >
                <Info className="h-4 w-4" />
              </button>
              {infoOpen && (
                <div className="absolute right-0 top-9 z-40 w-60 rounded-xl border border-[#DEE0E3] bg-white p-3.5 shadow-xl text-xs space-y-2">
                  <div className="font-semibold text-[#1F2329]">文档信息</div>
                  <div className="flex justify-between text-[#646A73]">
                    <span>字数统计</span>
                    <span className="font-medium text-[#1F2329]">{activeDoc.wordCount} 字</span>
                  </div>
                  <div className="flex justify-between text-[#646A73]">
                    <span>创建时间</span>
                    <span className="text-[#1F2329]">
                      {new Date(activeDoc.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#646A73]">
                    <span>最近更新</span>
                    <span className="text-[#1F2329]">
                      {new Date(activeDoc.updatedAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mx-1 h-4 w-px bg-[#DEE0E3]" />
          </>
        )}

        {/* User Avatar */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 hover:bg-[#EFF0F1] transition-colors cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3370FF] text-xs font-semibold text-white">
              {userInitial}
            </div>
            <span className="hidden lg:inline max-w-36 truncate text-xs text-[#646A73]">
              {user?.email ?? "加载中..."}
            </span>
          </button>

          {userOpen && (
            <div className="absolute right-0 top-9 z-40 w-56 rounded-xl border border-[#DEE0E3] bg-white p-2 shadow-xl">
              <div className="px-2.5 py-2 border-b border-[#EFF0F1]">
                <div className="text-xs font-semibold text-[#1F2329] truncate">
                  {user?.email}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#00B578]">
                  <Check className="h-3 w-3" /> Cloudflare Access 已验证
                </div>
              </div>
              <a
                href="/cdn-cgi/access/logout"
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[#646A73] hover:bg-[#FFF0F0] hover:text-[#F54A45] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> 退出 Access 会话
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
