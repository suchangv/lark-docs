import type { Doc, UserInfo } from "./types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMe(): Promise<UserInfo> {
  return requestJson<UserInfo>("/api/me");
}

export async function fetchDocs(trash = false): Promise<Doc[]> {
  const data = await requestJson<{ docs: Doc[] }>(
    trash ? "/api/docs?trash=1" : "/api/docs"
  );
  return data.docs;
}

export async function createDoc(payload: {
  parentId?: string | null;
  title?: string;
  emoji?: string | null;
  cover?: string | null;
  content?: string;
}): Promise<Doc> {
  const data = await requestJson<{ doc: Doc }>("/api/docs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.doc;
}

export async function updateDoc(
  id: string,
  payload: Partial<{
    title: string;
    emoji: string | null;
    cover: string | null;
    content: string;
    parentId: string | null;
    isFavorite: boolean;
    sortOrder: number;
    wordCount: number;
  }>
): Promise<Doc> {
  const data = await requestJson<{ doc: Doc }>(`/api/docs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.doc;
}

export async function deleteDoc(id: string, permanent = false): Promise<void> {
  await requestJson<{ ok: boolean }>(
    `/api/docs/${encodeURIComponent(id)}${permanent ? "?permanent=1" : ""}`,
    { method: "DELETE" }
  );
}

export async function restoreDoc(id: string): Promise<Doc> {
  const data = await requestJson<{ doc: Doc }>(
    `/api/docs/${encodeURIComponent(id)}/restore`,
    { method: "POST" }
  );
  return data.doc;
}

export async function duplicateDoc(id: string): Promise<Doc> {
  const data = await requestJson<{ doc: Doc }>(
    `/api/docs/${encodeURIComponent(id)}/duplicate`,
    { method: "POST" }
  );
  return data.doc;
}
