import { X } from "lucide-react";

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

export function EmojiPicker({
  onSelect,
  onRemove,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-0 top-full z-40 mt-2 w-72 rounded-xl border border-[#DEE0E3] bg-white p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[#646A73]">选择图标</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="text-xs text-[#8F959E] hover:text-[#F54A45] cursor-pointer"
          >
            移除
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-[#8F959E] hover:bg-[#EFF0F1] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
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
            className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-[#EFF0F1] transition-colors cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
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
  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-[#DEE0E3] bg-white p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[#646A73]">选择封面</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="text-xs text-[#8F959E] hover:text-[#F54A45] cursor-pointer"
          >
            移除封面
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-[#8F959E] hover:bg-[#EFF0F1] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
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
            className="h-10 rounded-lg border border-black/5 transition-transform hover:scale-105 cursor-pointer"
            style={{ background: preset.value }}
          />
        ))}
      </div>
    </div>
  );
}
