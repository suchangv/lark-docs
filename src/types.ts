export interface Doc {
  id: string;
  parentId: string | null;
  title: string;
  emoji: string | null;
  cover: string | null;
  content: string;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  sortOrder: number;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocTreeNode extends Doc {
  children: DocTreeNode[];
}

export interface UserInfo {
  email: string;
  authMethod: string;
  expiresAt: number;
}

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

export type SaveStatus = "saved" | "saving" | "error";
export type ViewMode = "doc" | "home" | "recent" | "favorites";
