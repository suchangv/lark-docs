import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

const LANGUAGES = [
  { value: "", label: "Plain Text" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "bash", label: "Bash / Shell" },
  { value: "json", label: "JSON" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "markdown", label: "Markdown" },
];

export function CodeBlockComponent({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const language = (node.attrs.language as string) || "";

  const handleCopy = () => {
    const text = node.textContent || "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <NodeViewWrapper className="group/code relative my-3 rounded-lg border border-[#E5E6EB] bg-[#F5F6F7] overflow-hidden">
      <div
        className="flex items-center justify-between border-b border-[#E5E6EB]/80 bg-[#EFF0F1]/70 px-3 py-1.5 text-xs text-[#646A73] select-none"
        contentEditable={false}
      >
        <select
          value={language}
          onChange={(e) => updateAttributes({ language: e.target.value })}
          className="bg-transparent font-medium text-[#646A73] outline-none cursor-pointer hover:text-[#1F2329]"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-[#646A73] hover:bg-black/5 hover:text-[#1F2329] transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#00B578]" />
              <span className="text-[#00B578]">已复制</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      <pre className="!m-0 !border-0 !rounded-none !bg-transparent px-4 py-3 text-sm font-mono overflow-x-auto">
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
