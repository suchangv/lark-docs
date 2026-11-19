import { useState } from "react";
import type { OutlineItem } from "../types";

interface OutlineTocProps {
  items: OutlineItem[];
  activeId: string | null;
  onSelect: (item: OutlineItem) => void;
}

export function OutlineToc({ items, activeId, onSelect }: OutlineTocProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const minLevel = Math.min(...items.map((i) => i.level));

  return (
    <div
      className="fixed right-5 top-28 z-20 hidden lg:block"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Minimalist lines when collapsed */}
      {!expanded ? (
        <div className="flex flex-col items-end gap-2.5 py-2 pr-1 cursor-pointer">
          {items.map((item) => {
            const isActive = item.id === activeId;
            const depth = item.level - minLevel;
            const width = depth === 0 ? "w-5" : depth === 1 ? "w-3.5" : "w-2.5";
            return (
              <div
                key={item.id}
                className={`h-[2.5px] rounded-full transition-all ${width} ${
                  isActive ? "bg-[#3370FF]" : "bg-[#C9CDD4]"
                }`}
              />
            );
          })}
        </div>
      ) : (
        <div className="w-60 max-h-[65vh] overflow-y-auto rounded-xl border border-[#DEE0E3] bg-white/95 backdrop-blur-sm p-3 shadow-lg">
          <div className="mb-2 px-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8F959E]">
            文档大纲
          </div>
          <nav className="space-y-0.5">
            {items.map((item) => {
              const isActive = item.id === activeId;
              const depth = Math.max(0, item.level - minLevel);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  style={{ paddingLeft: `${8 + depth * 12}px` }}
                  className={`block w-full truncate rounded-md py-1.5 pr-2 text-left text-[13px] transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#EBF1FF] font-medium text-[#3370FF]"
                      : "text-[#646A73] hover:bg-[#F5F6F7] hover:text-[#1F2329]"
                  }`}
                >
                  {item.text || "无标题章节"}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
