import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

const CALLOUT_THEMES: Record<string, { bg: string; border: string; label: string; dot: string }> = {
  blue: { bg: "bg-[#EBF1FF]/70", border: "border-[#BACEFD]", label: "蓝色", dot: "bg-[#3370FF]" },
  yellow: { bg: "bg-[#FFF7E6]", border: "border-[#FFE1A6]", label: "黄色", dot: "bg-[#FAAD14]" },
  green: { bg: "bg-[#E8F8F0]", border: "border-[#A9E5C7]", label: "绿色", dot: "bg-[#00B578]" },
  red: { bg: "bg-[#FFF0F0]", border: "border-[#FDCACA]", label: "红色", dot: "bg-[#F54A45]" },
  gray: { bg: "bg-[#F5F6F7]", border: "border-[#DEE0E3]", label: "灰色", dot: "bg-[#8F959E]" },
};

const QUICK_EMOJIS = ["💡", "📌", "⚠️", "✅", "🔥", "📘", "🎯", "💬", "🚀", "❗"];

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const colorKey = (node.attrs.color as string) || "blue";
  const emoji = (node.attrs.emoji as string) || "💡";
  const theme = CALLOUT_THEMES[colorKey] ?? CALLOUT_THEMES.blue;

  useEffect(() => {
    if (!showEmoji) return;
    const onPointerDown = (e: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as globalThis.Node)) {
        setShowEmoji(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [showEmoji]);

  return (
    <NodeViewWrapper
      className={`group/callout relative my-3 flex items-start gap-2.5 sm:gap-3 rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3 transition-colors ${theme.bg} ${theme.border}`}
    >
      <div ref={pickerRef} className="relative select-none pt-0.5" contentEditable={false}>
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-md text-lg hover:bg-black/5 transition-colors cursor-pointer"
          title="切换图标或背景色"
        >
          {emoji}
        </button>
        {showEmoji && (
          <div className="absolute left-0 top-9 z-30 w-48 max-w-[calc(100vw-40px)] rounded-xl border border-[#DEE0E3] bg-white p-2.5 shadow-lg">
            <div className="mb-1.5 text-[11px] font-medium text-[#8F959E]">图标</div>
            <div className="flex flex-wrap gap-1">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    updateAttributes({ emoji: e });
                    setShowEmoji(false);
                  }}
                  className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded hover:bg-[#EFF0F1] text-base cursor-pointer"
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="my-2 h-px bg-[#EFF0F1]" />
            <div className="mb-1.5 text-[11px] font-medium text-[#8F959E]">背景颜色</div>
            <div className="flex items-center gap-2">
              {Object.entries(CALLOUT_THEMES).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    updateAttributes({ color: key });
                    setShowEmoji(false);
                  }}
                  className={`h-5 w-5 rounded-full ${item.dot} cursor-pointer transition-transform ${
                    colorKey === key ? "ring-2 ring-offset-1 ring-[#3370FF] scale-110" : "opacity-75 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 [&>div>p:first-child]:mt-0 [&>div>p:last-child]:mb-0">
        <NodeViewContent />
      </div>

      <div
        className="hidden md:flex items-center gap-1 opacity-0 transition-opacity group-hover/callout:opacity-100 select-none pt-1"
        contentEditable={false}
      >
        {Object.entries(CALLOUT_THEMES).map(([key, item]) => (
          <button
            key={key}
            type="button"
            title={item.label}
            onClick={() => updateAttributes({ color: key })}
            className={`h-3.5 w-3.5 rounded-full ${item.dot} cursor-pointer transition-transform ${
              colorKey === key ? "ring-2 ring-offset-1 ring-[#3370FF] scale-110" : "opacity-60 hover:opacity-100"
            }`}
          />
        ))}
      </div>
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      emoji: { default: "💡" },
      color: { default: "blue" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});
