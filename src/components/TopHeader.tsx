import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  Info,
  ListTree,
  Loader2,
  LogOut,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelLeft,
  Search,
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
  onOpenSearch?: () => void;
  mobileOutlineOpen?: boolean;
  onToggleMobileOutline?: () => void;
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
  onOpenSearch,
  mobileOutlineOpen = false,
  onToggleMobileOutline,
  user,
}: TopHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setInfoOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
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
  const currentCrumb = breadcrumbs[breadcrumbs.length - 1] ?? activeDoc;
  const parentCrumb = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  return (
    <header className="safe-top relative z-30 flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-[#DEE0E3] bg-white px-2.5 sm:px-3.5">
      {/* Left: Sidebar toggle + Breadcrumbs + Save status */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "收起侧边栏" : "展开侧边栏"}
          aria-label={sidebarOpen ? "收起侧边栏" : "展开侧边栏"}
          className="flex h-9 w-9 md:h-7 md:w-7 shrink-0 items-center justify-center rounded-md text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329] transition-colors cursor-pointer"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {viewTitle ? (
          <span className="truncate text-sm font-medium text-[#1F2329]">{viewTitle}</span>
        ) : (
          <>
            {/* Desktop Breadcrumbs */}
            <nav className="hidden md:flex min-w-0 items-center gap-1 text-[13px]">
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

            {/* Mobile Compact Breadcrumb */}
            {currentCrumb && (
              <div className="flex md:hidden min-w-0 items-center gap-1 text-[13px]">
                {parentCrumb && (
                  <button
                    type="button"
                    onClick={() => onSelectDoc(parentCrumb.id)}
                    title={`返回上级：${parentCrumb.title || "无标题文档"}`}
                    aria-label={`返回上级：${parentCrumb.title || "无标题文档"}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329] cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="flex min-w-0 items-center gap-1 font-medium text-[#1F2329]">
                  {currentCrumb.emoji && <span className="shrink-0">{currentCrumb.emoji}</span>}
                  <span className="truncate">{currentCrumb.title || "无标题文档"}</span>
                </div>
              </div>
            )}
          </>
        )}

        {viewMode === "doc" && activeDoc && (
          <>
            <div className="ml-2 hidden sm:flex shrink-0 items-center gap-1 text-xs text-[#8F959E]">
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

            <div className="flex sm:hidden shrink-0 items-center pl-0.5">
              {saveStatus === "saving" && (
                <span title="保存中...">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3370FF]" />
                </span>
              )}
              {saveStatus === "saved" && (
                <span title="已保存">
                  <Cloud className="h-3.5 w-3.5 text-[#00B578]" />
                </span>
              )}
              {saveStatus === "error" && (
                <span title="保存失败，请检查网络">
                  <AlertCircle className="h-3.5 w-3.5 text-[#F54A45]" />
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: Actions + User */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            title="搜索文档"
            aria-label="搜索文档"
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-md text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329] cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>
        )}

        {viewMode === "doc" && activeDoc && (
          <>
            {onToggleMobileOutline && (
              <button
                type="button"
                onClick={onToggleMobileOutline}
                title="文档大纲"
                aria-label="文档大纲"
                aria-expanded={mobileOutlineOpen}
                className={`flex lg:hidden h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
                  mobileOutlineOpen
                    ? "bg-[#EBF1FF] text-[#3370FF]"
                    : "text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329]"
                }`}
              >
                <ListTree className="h-4 w-4" />
              </button>
            )}

            {/* Mobile More Menu */}
            <div className="relative md:hidden" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                title="更多操作"
                aria-label="更多操作"
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors cursor-pointer ${
                  moreOpen
                    ? "bg-[#EBF1FF] text-[#3370FF]"
                    : "text-[#646A73] hover:bg-[#EFF0F1] hover:text-[#1F2329]"
                }`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {moreOpen && (
                <div className="absolute right-0 top-10 z-50 w-60 max-w-[calc(100vw-20px)] rounded-xl border border-[#DEE0E3] bg-white p-1.5 shadow-xl text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onToggleFavorite(activeDoc);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[#1F2329] hover:bg-[#F5F6F7] cursor-pointer"
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        activeDoc.isFavorite ? "fill-[#FAAD14] text-[#FAAD14]" : "text-[#646A73]"
                      }`}
                    />
                    <span>{activeDoc.isFavorite ? "取消收藏" : "收藏文档"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onExportMarkdown();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[#1F2329] hover:bg-[#F5F6F7] cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="h-3.5 w-3.5 text-[#646A73]" />
                      导出 Markdown
                    </span>
                    <span className="text-[10px] text-[#8F959E]">.md</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onExportHtml();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[#1F2329] hover:bg-[#F5F6F7] cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="h-3.5 w-3.5 text-[#646A73]" />
                      导出 HTML
                    </span>
                    <span className="text-[10px] text-[#8F959E]">.html</span>
                  </button>

                  <div className="my-1.5 h-px bg-[#EFF0F1]" />

                  <div className="space-y-1.5 px-2.5 py-1 text-[11px]">
                    <div className="font-semibold text-[#1F2329]">文档信息</div>
                    <div className="flex justify-between text-[#646A73]">
                      <span>字数统计</span>
                      <span className="font-medium text-[#1F2329]">{activeDoc.wordCount} 字</span>
                    </div>
                    <div className="flex justify-between gap-2 text-[#646A73]">
                      <span className="shrink-0">创建时间</span>
                      <span className="truncate text-[#1F2329]">
                        {new Date(activeDoc.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 text-[#646A73]">
                      <span className="shrink-0">最近更新</span>
                      <span className="truncate text-[#1F2329]">
                        {new Date(activeDoc.updatedAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1">
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
                className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-[#646A73] hover:bg-[#EFF0F1] cursor-pointer"
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
                  <span>导出</span>
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-9 z-40 w-44 max-w-[calc(100vw-20px)] rounded-xl border border-[#DEE0E3] bg-white p-1 shadow-xl">
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
                  <div className="absolute right-0 top-9 z-40 w-60 max-w-[calc(100vw-20px)] rounded-xl border border-[#DEE0E3] bg-white p-3.5 shadow-xl text-xs space-y-2">
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
            </div>
          </>
        )}

        {/* User Avatar */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full p-0.5 lg:pr-2 hover:bg-[#EFF0F1] transition-colors cursor-pointer"
          >
            <div className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-[#3370FF] text-xs font-semibold text-white">
              {userInitial}
            </div>
            <span className="hidden lg:inline max-w-36 truncate text-xs text-[#646A73]">
              {user?.email ?? "加载中..."}
            </span>
          </button>

          {userOpen && (
            <div className="absolute right-0 top-10 sm:top-9 z-50 w-56 max-w-[calc(100vw-20px)] rounded-xl border border-[#DEE0E3] bg-white p-2 shadow-xl">
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
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 sm:py-1.5 text-xs text-[#646A73] hover:bg-[#FFF0F0] hover:text-[#F54A45] transition-colors"
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
