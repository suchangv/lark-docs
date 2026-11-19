-- Lark Docs D1 Schema
CREATE TABLE IF NOT EXISTS docs (
	id TEXT PRIMARY KEY,
	parent_id TEXT,
	title TEXT NOT NULL DEFAULT '无标题文档',
	emoji TEXT,
	cover TEXT,
	content TEXT NOT NULL DEFAULT '',
	is_favorite INTEGER NOT NULL DEFAULT 0,
	is_deleted INTEGER NOT NULL DEFAULT 0,
	deleted_at TEXT,
	sort_order INTEGER NOT NULL DEFAULT 0,
	word_count INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_docs_parent ON docs(parent_id);
CREATE INDEX IF NOT EXISTS idx_docs_deleted ON docs(is_deleted);
CREATE INDEX IF NOT EXISTS idx_docs_updated ON docs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_docs_order ON docs(sort_order ASC);
