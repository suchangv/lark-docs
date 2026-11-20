import { Clock, FileText, Plus, Star } from "lucide-react";
import type { Doc, ViewMode } from "../types";
import { extractPlainText, formatRelativeTime } from "../utils/docTree";

interface DashboardViewsProps {
  mode: Exclude<ViewMode, "doc">;
  docs: Doc[];
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
}

export function DashboardViews({
  mode,
  docs,
  onSelectDoc,
  onCreateDoc,
}: DashboardViewsProps) {
  const sortedByUpdated = [...docs].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
  const favorites = sortedByUpdated.filter((d) => d.isFavorite);

  const list = mode === "favorites" ? favorites : sortedByUpdated;

  const heading =
    mode === "home"
      ? "欢迎回到个人知识库"
      : mode === "recent"
      ? "最近编辑的文档"
      : "我的收藏夹";

  const subheading =
    mode === "home"
      ? `共 ${docs.length} 篇文档，支持云端实时同步与多级树形管理`
      : mode === "recent"
      ? "按最近修改时间排序"
      : `共收藏 ${favorites.length} 篇文档`;

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain bg-white">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-12">
        <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1F2329]">{heading}</h1>
            <p className="mt-1 text-xs sm:text-sm text-[#646A73]">{subheading}</p>
          </div>
          <button
            type="button"
            onClick={onCreateDoc}
            className="self-start sm:self-auto shrink-0 flex items-center gap-1.5 rounded-lg bg-[#3370FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#2860E1] active:bg-[#1E4FD0] transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" /> 新建文档
          </button>
        </div>

        {mode === "home" && favorites.length > 0 && (
          <section className="mb-8 sm:mb-10">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8F959E]">
              <Star className="h-3.5 w-3.5 fill-[#FAAD14] text-[#FAAD14]" /> 置顶收藏
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onSelectDoc(doc.id)}
                  className="group flex flex-col justify-between rounded-xl border border-[#DEE0E3] bg-white p-3.5 sm:p-4 text-left hover:border-[#3370FF]/60 hover:shadow-sm active:bg-[#EFF0F1] transition-all cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">
                        {doc.emoji || <FileText className="h-5 w-5 text-[#8F959E]" />}
                      </span>
                      <span className="truncate font-semibold text-[#1F2329] group-hover:text-[#3370FF]">
                        {doc.title || "无标题文档"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-[#646A73]">
                      {extractPlainText(doc.content) || "暂无正文内容"}
                    </p>
                  </div>
                  <div className="mt-3 text-[11px] text-[#8F959E]">
                    更新于 {formatRelativeTime(doc.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8F959E]">
            <Clock className="h-3.5 w-3.5" />
            {mode === "favorites" ? "收藏列表" : "最近文档"}
          </div>
          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DEE0E3] py-16 text-center text-sm text-[#8F959E]">
              暂无文档
            </div>
          ) : (
            <div className="divide-y divide-[#EFF0F1] rounded-xl border border-[#DEE0E3]">
              {list.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onSelectDoc(doc.id)}
                  className="flex w-full items-center justify-between px-3.5 py-3 sm:px-4 text-left hover:bg-[#F5F6F7] active:bg-[#EFF0F1] transition-colors cursor-pointer first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-lg leading-none">
                      {doc.emoji || <FileText className="h-4 w-4 text-[#8F959E]" />}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#1F2329]">
                        {doc.title || "无标题文档"}
                      </div>
                      <div className="truncate text-xs text-[#8F959E]">
                        {extractPlainText(doc.content) || "空白文档"}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-xs text-[#8F959E]">
                    {formatRelativeTime(doc.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
