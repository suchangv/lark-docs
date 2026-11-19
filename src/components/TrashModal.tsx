import { FileText, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteDoc, fetchDocs, restoreDoc } from "../api";
import type { Doc } from "../types";
import { formatRelativeTime } from "../utils/docTree";

interface TrashModalProps {
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export function TrashModal({ open, onClose, onRestored }: TrashModalProps) {
  const [items, setItems] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchDocs(true);
      setItems(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  if (!open) return null;

  const handleRestore = async (id: string) => {
    await restoreDoc(id);
    setItems((prev) => prev.filter((d) => d.id !== id));
    onRestored();
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm("确定彻底删除该文档及其子文档？此操作不可恢复。")) return;
    await deleteDoc(id, true);
    setItems((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[1px]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#DEE0E3] bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#DEE0E3] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-[#646A73]" />
            <h2 className="text-sm font-semibold text-[#1F2329]">回收站</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#8F959E] hover:bg-[#EFF0F1] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-3">
          {loading ? (
            <div className="py-12 text-center text-sm text-[#8F959E]">加载中...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#8F959E]">
              回收站空空如也
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-[#F5F6F7] transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="text-base leading-none">
                      {doc.emoji || <FileText className="h-4 w-4 text-[#8F959E]" />}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#1F2329]">
                        {doc.title || "无标题文档"}
                      </div>
                      <div className="text-[11px] text-[#8F959E]">
                        删除于 {doc.deletedAt ? formatRelativeTime(doc.deletedAt) : "未知"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRestore(doc.id)}
                      title="恢复文档"
                      className="flex items-center gap-1 rounded-lg border border-[#DEE0E3] bg-white px-2.5 py-1 text-xs font-medium text-[#1F2329] hover:border-[#3370FF] hover:text-[#3370FF] cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> 恢复
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(doc.id)}
                      title="彻底删除"
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#F54A45] hover:bg-[#FFF0F0] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
