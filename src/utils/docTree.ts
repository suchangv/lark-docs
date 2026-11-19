import type { Doc, DocTreeNode } from "../types";
export { extractPlainText, countWords, jsonToMarkdown } from "../../shared/tiptapMarkdown";

export function buildDocTree(docs: Doc[]): DocTreeNode[] {
  const map = new Map<string, DocTreeNode>();
  for (const doc of docs) {
    map.set(doc.id, { ...doc, children: [] });
  }
  const roots: DocTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRecursive = (nodes: DocTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
    for (const n of nodes) sortRecursive(n.children);
  };
  sortRecursive(roots);
  return roots;
}

export function getBreadcrumbs(docs: Doc[], docId: string): Doc[] {
  const map = new Map(docs.map((d) => [d.id, d]));
  const chain: Doc[] = [];
  let curr = map.get(docId);
  const visited = new Set<string>();
  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    chain.unshift(curr);
    curr = curr.parentId ? map.get(curr.parentId) : undefined;
  }
  return chain;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
