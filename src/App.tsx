import type { Editor } from "@tiptap/react";
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
import type { Doc, SaveStatus, UserInfo, ViewMode } from "./types";
import {
  buildDocTree,
  downloadFile,
  getBreadcrumbs,
  jsonToMarkdown,
} from "./utils/docTree";

export function App() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("doc");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(264);
  const [wideMode, setWideMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [searchOpen, setSearchOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const editorRef = useRef<Editor | null>(null);
  const saveTimers = useRef<Map<string, number>>(new Map());
  const pendingPatches = useRef<Map<string, Partial<Doc>>>(new Map());

  const loadAll = useCallback(async () => {
    try {
      const [me, docList] = await Promise.all([fetchMe(), fetchDocs(false)]);
      setUser(me);
      setDocs(docList);
      setActiveDocId((curr) => {
        if (curr && docList.some((d) => d.id === curr)) return curr;
        return docList[0]?.id ?? null;
      });
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
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const tree = useMemo(() => buildDocTree(docs), [docs]);
  const activeDoc = useMemo(
    () => docs.find((d) => d.id === activeDocId) ?? null,
    [docs, activeDocId]
  );
  const breadcrumbs = useMemo(
    () => (activeDocId ? getBreadcrumbs(docs, activeDocId) : []),
    [docs, activeDocId]
  );

  const handleSelectDoc = (id: string) => {
    setActiveDocId(id);
    setViewMode("doc");
  };

  const handleCreateDoc = async (parentId: string | null = null) => {
    const created = await createDoc({
      parentId,
      title: "无标题文档",
    });
    setDocs((prev) => [...prev, created]);
    setActiveDocId(created.id);
    setViewMode("doc");
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
    const copy = await duplicateDoc(id);
    setDocs((prev) => [...prev, copy]);
    setActiveDocId(copy.id);
    setViewMode("doc");
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
    if (activeDocId === id || !refreshed.some((d) => d.id === activeDocId)) {
      setActiveDocId(refreshed[0]?.id ?? null);
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
      <div className="flex h-screen items-center justify-center bg-white text-sm text-[#8F959E]">
        正在加载 Lark Docs...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#1F2329]">
      <Sidebar
        open={sidebarOpen}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
        tree={tree}
        activeDocId={activeDocId}
        viewMode={viewMode}
        onSelectView={setViewMode}
        onSelectDoc={handleSelectDoc}
        onCreateDoc={handleCreateDoc}
        onRenameDoc={handleRenameDoc}
        onDuplicateDoc={handleDuplicateDoc}
        onToggleFavorite={handleToggleFavorite}
        onDeleteDoc={handleDeleteDoc}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenTrash={() => setTrashOpen(true)}
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
          user={user}
        />

        {viewMode !== "doc" ? (
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
            onChangeDoc={handleChangeDoc}
            onEditorReady={(ed) => {
              editorRef.current = ed;
            }}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-[#8F959E]">
            <p>暂无文档，点击下方按钮创建第一篇文档</p>
            <button
              type="button"
              onClick={() => handleCreateDoc(null)}
              className="rounded-lg bg-[#3370FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#2860E1] cursor-pointer"
            >
              新建文档
            </button>
          </div>
        )}
      </div>

      <SearchModal
        open={searchOpen}
        docs={docs}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSelectDoc}
      />

      <TrashModal
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        onRestored={loadAll}
      />
    </div>
  );
}

export default App;
