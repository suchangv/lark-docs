import { FileText, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Doc } from "../types";
import { extractPlainText, formatRelativeTime } from "../utils/docTree";

interface SearchModalProps {
  open: boolean;
  docs: Doc[];
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function SearchModal({
  open,
  docs,
  initialQuery = "",
  onQueryChange,
  onClose,
  onSelect,
}: SearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open, initialQuery]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = docs.map((doc) => ({
      doc,
      snippet: extractPlainText(doc.content),
    }));
    if (!q) {
      return [...list].sort((a, b) =>
        b.doc.updatedAt.localeCompare(a.doc.updatedAt)
      );
    }
    return list.filter(
      ({ doc, snippet }) =>
        doc.title.toLowerCase().includes(q) ||
        snippet.toLowerCase().includes(q)
    );
  }, [docs, query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (results.length ? (i + 1) % results.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) =>
          results.length ? (i - 1 + results.length) % results.length : 0
        );
      } else if (e.key === "Enter" && results[selectedIdx]) {
        e.preventDefault();
        onSelect(results[selectedIdx].doc.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, selectedIdx, onSelect, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-3 pt-4 sm:p-4 sm:pt-20 backdrop-blur-[1px]"
      onPointerDown={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#DEE0E3] bg-white shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[#DEE0E3] px-3.5 py-2.5 sm:px-4 sm:py-3">
          <Search className="h-4 w-4 shrink-0 text-[#8F959E]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              onQueryChange?.(next);
            }}
            placeholder="搜索文档标题或正文内容..."
            className="min-w-0 flex-1 text-base sm:text-sm text-[#1F2329] placeholder-[#8F959E] outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                onQueryChange?.("");
                inputRef.current?.focus();
              }}
              aria-label="清空搜索"
              className="rounded-md px-2 py-1 text-xs text-[#8F959E] hover:bg-[#EFF0F1] hover:text-[#1F2329] cursor-pointer shrink-0"
            >
              清空
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭搜索"
            className="rounded-lg p-1.5 sm:p-1 text-[#8F959E] hover:bg-[#EFF0F1] cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60dvh] sm:max-h-96 overflow-y-auto overscroll-contain p-2">
          {results.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#8F959E]">
              没有找到匹配的文档
            </div>
          ) : (
            results.map(({ doc, snippet }, idx) => (
              <button
                key={doc.id}
                type="button"
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => {
                  onSelect(doc.id);
                }}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer ${
                  idx === selectedIdx ? "bg-[#EBF1FF]" : "hover:bg-[#F5F6F7]"
                }`}
              >
                <span className="mt-0.5 text-base leading-none">
                  {doc.emoji || <FileText className="h-4 w-4 text-[#8F959E]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-sm font-medium ${
                        idx === selectedIdx ? "text-[#3370FF]" : "text-[#1F2329]"
                      }`}
                    >
                      {doc.title || "无标题文档"}
                    </span>
                    <span className="shrink-0 text-[11px] text-[#8F959E]">
                      {formatRelativeTime(doc.updatedAt)}
                    </span>
                  </div>
                  {snippet && (
                    <p className="mt-0.5 truncate text-xs text-[#646A73]">
                      {snippet}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
