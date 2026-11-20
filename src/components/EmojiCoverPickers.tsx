import { X } from "lucide-react";
import { useEffect, useRef } from "react";

const EMOJIS = [
  "📘", "📄", "📝", "📋", "📌", "📍", "🧭", "🚀", "💡", "✨",
  "🎯", "🔥", "⚡", "🎨", "💻", "🛠️", "⚙️", "🔒", "🔑", "📊",
  "📈", "🗂️", "📁", "🏷️", "🔖", "💬", "📢", "✅", "⚠️", "❗",
  "❤️", "⭐", "🌟", "🎉", "🏆", "🧠", "🌱", "🌊", "☀️", "🌙",
];

export const COVER_PRESETS = [
  {
    name: "飞书蓝渐变",
    value: "linear-gradient(135deg, #3370FF 0%, #6B9BFF 50%, #A5C4FF 100%)",
  },
  {
    name: "极光青绿",
    value: "linear-gradient(135deg, #00B578 0%, #52D1A2 100%)",
  },
  {
    name: "日落暖橙",
    value: "linear-gradient(135deg, #FF7D00 0%, #FFB65C 100%)",
  },
  {
    name: "暮光紫韵",
    value: "linear-gradient(135deg, #722ED1 0%, #B37FEB 100%)",
  },
  {
    name: "玫瑰粉霞",
    value: "linear-gradient(135deg, #F54A45 0%, #FF8F8B 100%)",
  },
  {
    name: "深海墨蓝",
    value: "linear-gradient(135deg, #1F2329 0%, #4E5969 100%)",
  },
  {
    name: "柔雾淡蓝",
    value: "linear-gradient(135deg, #EBF1FF 0%, #D6E4FF 100%)",
  },
  {
    name: "薄荷浅绿",
    value: "linear-gradient(135deg, #E8F8F0 0%, #C6F0DC 100%)",
  },
];

function useOutsideClose(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const container = ref.current?.parentElement ?? ref.current;
      if (container && !container.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [ref, onClose]);
}

export function EmojiPicker({
  onSelect,
  onRemove,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useOutsideClose(panelRef, onClose);

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/25 sm:hidden"
      />
      <div
        ref={panelRef}
        className="max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:z-50 max-sm:safe-bottom sm:absolute sm:left-0 sm:top-full sm:z-40 sm:mt-2 sm:w-72 rounded-2xl sm:rounded-xl border border-[#DEE0E3] bg-white p-3.5 sm:p-3 shadow-xl"
      >
        <div className="mb-2.5 sm:mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-[#646A73]">选择图标</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="px-1.5 py-1 sm:p-0 text-xs text-[#8F959E] hover:text-[#F54A45] cursor-pointer"
            >
              移除
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="rounded p-1 sm:p-0.5 text-[#8F959E] hover:bg-[#EFF0F1] cursor-pointer"
            >
              <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="flex h-9 w-full sm:h-8 sm:w-8 items-center justify-center rounded-md text-lg hover:bg-[#EFF0F1] active:bg-[#E5E6EB] transition-colors cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export function CoverPicker({
  onSelect,
  onRemove,
  onClose,
}: {
  onSelect: (cover: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useOutsideClose(panelRef, onClose);

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/25 sm:hidden"
      />
      <div
        ref={panelRef}
        className="max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:z-50 max-sm:safe-bottom sm:absolute sm:right-0 sm:top-full sm:z-40 sm:mt-2 sm:w-72 rounded-2xl sm:rounded-xl border border-[#DEE0E3] bg-white p-3.5 sm:p-3 shadow-xl"
      >
        <div className="mb-2.5 sm:mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-[#646A73]">选择封面</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="px-1.5 py-1 sm:p-0 text-xs text-[#8F959E] hover:text-[#F54A45] cursor-pointer"
            >
              移除封面
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="rounded p-1 sm:p-0.5 text-[#8F959E] hover:bg-[#EFF0F1] cursor-pointer"
            >
              <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {COVER_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              title={preset.name}
              onClick={() => {
                onSelect(preset.value);
                onClose();
              }}
              className="h-11 sm:h-10 rounded-lg border border-black/5 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              style={{ background: preset.value }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
