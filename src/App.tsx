import type { Editor } from "@tiptap/react";
import { FileQuestion, Home, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDoc,
  deleteDoc,
  duplicateDoc,
  fetchDocs,
  fetchMe,
  updateDoc,
} from "./api";
import { DashboardViews } from "./components/DashboardViews";
import { DocEditor } from "./components/DocEditor";
import { SearchModal } from "./components/SearchModal";
import { Sidebar } from "./components/Sidebar";
import { TopHeader } from "./components/TopHeader";
import { TrashModal } from "./components/TrashModal";
import { useIsMobile } from "./hooks/useViewport";
import { buildDocPath, buildSearchPath, useRoute } from "./router";
import type { Doc, SaveStatus, UserInfo, ViewMode } from "./types";
import {
  buildDocTree,
  downloadFile,
  getBreadcrumbs,
  jsonToMarkdown,
} from "./utils/docTree";

export function App() {
  const { route, pathWithSearch, navigate } = useRoute();
  const isMobile = useIsMobile();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [sidebarWidth, setSidebarWidth] = useState(264);
  const [wideMode, setWideMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const prevIsMobileRef = useRef(isMobile);

  useEffect(() => {
    if (prevIsMobileRef.current !== isMobile) {
      prevIsMobileRef.current = isMobile;
      setSidebarOpen(!isMobile);
      if (!isMobile) {
        setMobileOutlineOpen(false);
      }
    }
  }, [isMobile]);

  // Keep track of the last non-modal view so /search and /trash modals render over it
  // and closing them returns to the previous URL.
  const lastBgPathRef = useRef<string>("/");
  const [bgView, setBgView] = useState<{ viewMode: ViewMode; docId: string | null }>({
    viewMode: "home",
    docId: null,
  });

  const editorRef = useRef<Editor | null>(null);
  const saveTimers = useRef<Map<string, number>>(new Map());
  const pendingPatches = useRef<Map<string, Partial<Doc>>>(new Map());

  // Backward compatibility: redirect legacy /?doc=<id> to /doc/<id>
  useEffect(() => {
    if (route.name === "home") {
      const legacyDoc = new URLSearchParams(window.location.search).get("doc");
      if (legacyDoc) {
        navigate(buildDocPath(legacyDoc), { replace: true });
      }
    }
  }, [route.name, navigate]);

  useEffect(() => {
    if (route.name === "home" || route.name === "recent" || route.name === "favorites") {
      lastBgPathRef.current = pathWithSearch;
      setBgView({ viewMode: route.name, docId: null });
    } else if (route.name === "doc") {
      lastBgPathRef.current = pathWithSearch;
      setBgView({ viewMode: "doc", docId: route.docId });
    }
  }, [route, pathWithSearch]);

  const searchOpen = route.name === "search";
  const trashOpen = route.name === "trash";
  const viewMode: ViewMode =
    route.name === "doc"
      ? "doc"
      : route.name === "home" || route.name === "recent" || route.name === "favorites"
      ? route.name
      : bgView.viewMode;
  const activeDocId: string | null =
    route.name === "doc" ? route.docId : viewMode === "doc" ? bgView.docId : null;

  const loadAll = useCallback(async () => {
    try {
      const [me, docList] = await Promise.all([fetchMe(), fetchDocs(false)]);
      setUser(me);
      setDocs(docList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Global Cmd/Ctrl + K search shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (route.name === "search") {
          navigate(lastBgPathRef.current || "/");
        } else {
          navigate("/search");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [route.name, navigate]);

  const tree = useMemo(() => buildDocTree(docs), [docs]);
  const activeDoc = useMemo(
    () => (activeDocId ? docs.find((d) => d.id === activeDocId) ?? null : null),
    [docs, activeDocId]
  );
  const breadcrumbs = useMemo(
    () => (activeDoc ? getBreadcrumbs(docs, activeDoc.id) : []),
    [docs, activeDoc]
  );

  // Sync document.title with current route / active document
  useEffect(() => {
    if (route.name === "doc") {
      if (loading) {
        document.title = "Lark Docs";
      } else if (activeDoc) {
        document.title = `${activeDoc.title || "无标题文档"} · Lark Docs`;
      } else {
        document.title = "文档不存在 · Lark Docs";
      }
    } else if (route.name === "home") {
      document.title = "主页 · Lark Docs";
    } else if (route.name === "recent") {
      document.title = "最近编辑 · Lark Docs";
    } else if (route.name === "favorites") {
      document.title = "收藏夹 · Lark Docs";
    } else if (route.name === "trash") {
      document.title = "回收站 · Lark Docs";
    } else if (route.name === "search") {
      document.title = route.query ? `搜索: ${route.query} · Lark Docs` : "搜索 · Lark Docs";
    } else {
      document.title = "页面不存在 · Lark Docs";
    }
  }, [route, activeDoc, loading]);

  const closeSidebarOnMobile = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setMobileOutlineOpen(false);
  }, [activeDocId, viewMode]);

  const handleSelectDoc = useCallback(
    (id: string) => {
      closeSidebarOnMobile();
      navigate(buildDocPath(id));
    },
    [navigate, closeSidebarOnMobile]
  );

  const handleSelectView = useCallback(
    (mode: ViewMode) => {
      closeSidebarOnMobile();
      if (mode === "home") navigate("/");
      else if (mode === "recent") navigate("/recent");
      else if (mode === "favorites") navigate("/favorites");
      else if (activeDocId) navigate(buildDocPath(activeDocId));
      else navigate("/");
    },
    [navigate, activeDocId, closeSidebarOnMobile]
  );

  const handleCreateDoc = async (parentId: string | null = null) => {
    closeSidebarOnMobile();
    const created = await createDoc({
      parentId,
      title: "无标题文档",
    });
    setDocs((prev) => [...prev, created]);
    navigate(buildDocPath(created.id));
  };

  const handleChangeDoc = useCallback(
    (
      docId: string,
      patch: Partial<Pick<Doc, "title" | "emoji" | "cover" | "content" | "wordCount">>
    ) => {
      const now = new Date().toISOString();
      setDocs((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, ...patch, updatedAt: now } : d))
      );

      // Immediate save for emoji/cover, debounced for typing
      const isInstant = "emoji" in patch || "cover" in patch;
      const merged = { ...(pendingPatches.current.get(docId) ?? {}), ...patch };
      pendingPatches.current.set(docId, merged);
      setSaveStatus("saving");

      const existingTimer = saveTimers.current.get(docId);
      if (existingTimer) window.clearTimeout(existingTimer);

      const flush = async () => {
        const payload = pendingPatches.current.get(docId);
        pendingPatches.current.delete(docId);
        saveTimers.current.delete(docId);
        if (!payload) return;
        try {
          await updateDoc(docId, payload);
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
      };

      if (isInstant) {
        flush();
      } else {
        const timer = window.setTimeout(flush, 600);
        saveTimers.current.set(docId, timer);
      }
    },
    []
  );

  const handleRenameDoc = async (doc: Doc) => {
    const nextTitle = window.prompt("重命名文档:", doc.title);
    if (nextTitle === null) return;
    const updated = await updateDoc(doc.id, { title: nextTitle.trim() || "无标题文档" });
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
  };

  const handleDuplicateDoc = async (id: string) => {
    closeSidebarOnMobile();
    const copy = await duplicateDoc(id);
    setDocs((prev) => [...prev, copy]);
    navigate(buildDocPath(copy.id));
  };

  const handleToggleFavorite = async (doc: Doc) => {
    const next = !doc.isFavorite;
    setDocs((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, isFavorite: next } : d))
    );
    await updateDoc(doc.id, { isFavorite: next });
  };

  const handleDeleteDoc = async (id: string) => {
    await deleteDoc(id, false);
    const refreshed = await fetchDocs(false);
    setDocs(refreshed);
    if (route.name === "doc" && !refreshed.some((d) => d.id === route.docId)) {
      navigate("/");
    }
  };

  const handleExportMarkdown = () => {
    if (!activeDoc) return;
    const md = jsonToMarkdown(activeDoc.title, activeDoc.content);
    downloadFile(`${activeDoc.title || "无标题文档"}.md`, md, "text/markdown;charset=utf-8");
  };

  const handleExportHtml = () => {
    if (!activeDoc) return;
    const innerHtml = editorRef.current?.getHTML() ?? "";
    const fullHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${activeDoc.title || "无标题文档"}</title>
<style>
  body { max-width: 760px; margin: 48px auto; padding: 0 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; color: #1F2329; line-height: 1.75; }
  h1 { font-size: 2rem; margin-bottom: 1rem; }
  pre { background: #F5F6F7; padding: 14px; border-radius: 8px; overflow-x: auto; }
  code { background: #F2F3F5; padding: 2px 5px; border-radius: 4px; }
  blockquote { border-left: 3px solid #BBBFC4; padding-left: 16px; color: #646A73; margin: 12px 0; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #DEE0E3; padding: 8px 12px; text-align: left; }
  th { background: #F5F6F7; }
</style>
</head>
<body>
<h1>${activeDoc.emoji ? activeDoc.emoji + " " : ""}${activeDoc.title || "无标题文档"}</h1>
${innerHtml}
</body>
</html>`;
    downloadFile(`${activeDoc.title || "无标题文档"}.html`, fullHtml, "text/html;charset=utf-8");
  };

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-white text-sm text-[#8F959E]">
        正在加载 Lark Docs...
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white text-[#1F2329]">
      <Sidebar
        open={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
        tree={tree}
        activeDocId={activeDocId}
        viewMode={viewMode}
        onSelectView={handleSelectView}
        onSelectDoc={handleSelectDoc}
        onCreateDoc={handleCreateDoc}
        onRenameDoc={handleRenameDoc}
        onDuplicateDoc={handleDuplicateDoc}
        onToggleFavorite={handleToggleFavorite}
        onDeleteDoc={handleDeleteDoc}
        onOpenSearch={() => {
          closeSidebarOnMobile();
          navigate("/search");
        }}
        onOpenTrash={() => {
          closeSidebarOnMobile();
          navigate("/trash");
        }}
        trashOpen={trashOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          breadcrumbs={breadcrumbs}
          activeDoc={activeDoc}
          viewMode={viewMode}
          saveStatus={saveStatus}
          wideMode={wideMode}
          onToggleWideMode={() => setWideMode((v) => !v)}
          onSelectDoc={handleSelectDoc}
          onToggleFavorite={handleToggleFavorite}
          onExportMarkdown={handleExportMarkdown}
          onExportHtml={handleExportHtml}
          onOpenSearch={() => {
            closeSidebarOnMobile();
            navigate("/search");
          }}
          mobileOutlineOpen={mobileOutlineOpen}
          onToggleMobileOutline={() => setMobileOutlineOpen((v) => !v)}
          user={user}
        />

        {route.name === "not_found" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F6F7] text-[#8F959E]">
              <FileQuestion className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-[#1F2329]">404 · 页面不存在</h2>
            <p className="max-w-sm text-sm text-[#646A73]">
              未找到路径 <code className="rounded bg-[#F2F3F5] px-1.5 py-0.5 text-xs">{route.path}</code>
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[#3370FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#2860E1] cursor-pointer"
            >
              <Home className="h-4 w-4" /> 返回主页
            </button>
          </div>
        ) : viewMode !== "doc" ? (
          <DashboardViews
            mode={viewMode}
            docs={docs}
            onSelectDoc={handleSelectDoc}
            onCreateDoc={() => handleCreateDoc(null)}
          />
        ) : activeDoc ? (
          <DocEditor
            doc={activeDoc}
            wideMode={wideMode}
            isMobile={isMobile}
            mobileOutlineOpen={mobileOutlineOpen}
            onMobileOutlineOpenChange={setMobileOutlineOpen}
            onChangeDoc={handleChangeDoc}
            onEditorReady={(ed) => {
              editorRef.current = ed;
            }}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F6F7] text-[#8F959E]">
              <FileQuestion className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-[#1F2329]">文档不存在或已被移入回收站</h2>
            <p className="max-w-sm text-sm text-[#646A73]">
              该文档可能已被删除，或链接地址无效。你可以返回主页，或前往回收站恢复文档。
            </p>
            <div className="mt-1 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#3370FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#2860E1] cursor-pointer"
              >
                <Home className="h-4 w-4" /> 返回主页
              </button>
              <button
                type="button"
                onClick={() => navigate("/trash")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DEE0E3] bg-white px-4 py-2 text-sm font-medium text-[#1F2329] hover:bg-[#F5F6F7] cursor-pointer"
              >
                <Trash2 className="h-4 w-4 text-[#646A73]" /> 打开回收站
              </button>
            </div>
          </div>
        )}
      </div>

      <SearchModal
        open={searchOpen}
        docs={docs}
        initialQuery={route.name === "search" ? route.query : ""}
        onQueryChange={(q) => navigate(buildSearchPath(q), { replace: true })}
        onClose={() => navigate(lastBgPathRef.current || "/")}
        onSelect={handleSelectDoc}
      />

      <TrashModal
        open={trashOpen}
        onClose={() => navigate(lastBgPathRef.current || "/")}
        onRestored={loadAll}
      />
    </div>
  );
}

export default App;
