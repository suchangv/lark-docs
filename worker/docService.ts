import {
	appendTiptapNodes,
	countWords,
	extractPlainText,
	jsonToMarkdown,
	markdownToTiptapJson,
	validateTiptapJson,
	type TiptapNode,
} from "../shared/tiptapMarkdown";

export interface DocRow {
	id: string;
	parent_id: string | null;
	title: string;
	emoji: string | null;
	cover: string | null;
	content: string;
	is_favorite: number;
	is_deleted: number;
	deleted_at: string | null;
	sort_order: number;
	word_count: number;
	created_at: string;
	updated_at: string;
}

export interface DocSummary {
	id: string;
	parentId: string | null;
	title: string;
	emoji: string | null;
	isFavorite: boolean;
	sortOrder: number;
	wordCount: number;
	createdAt: string;
	updatedAt: string;
	url?: string;
}

export function buildDocUrl(baseUrl: string | undefined, id: string): string | undefined {
	const trimmed = baseUrl?.trim().replace(/\/+$/, "");
	if (!trimmed) return undefined;
	return `${trimmed}/doc/${encodeURIComponent(id)}`;
}

export function toDocSummary(row: DocRow, publicBaseUrl?: string): DocSummary {
	const summary: DocSummary = {
		id: row.id,
		parentId: row.parent_id,
		title: row.title,
		emoji: row.emoji,
		isFavorite: row.is_favorite === 1,
		sortOrder: row.sort_order,
		wordCount: row.word_count,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
	const url = buildDocUrl(publicBaseUrl, row.id);
	if (url) summary.url = url;
	return summary;
}

export async function listActiveDocs(
	db: D1Database,
	options: { parentId?: string | null; publicBaseUrl?: string } = {},
): Promise<DocSummary[]> {
	let query = "SELECT * FROM docs WHERE is_deleted = 0";
	const bindings: unknown[] = [];

	if (options.parentId === null) {
		query += " AND parent_id IS NULL";
	} else if (typeof options.parentId === "string") {
		query += " AND parent_id = ?";
		bindings.push(options.parentId);
	}

	query += " ORDER BY sort_order ASC, created_at ASC";
	const stmt = bindings.length > 0 ? db.prepare(query).bind(...bindings) : db.prepare(query);
	const { results } = await stmt.all<DocRow>();
	return (results ?? []).map((row) => toDocSummary(row, options.publicBaseUrl));
}

export async function getDocWithContext(
	db: D1Database,
	id: string,
	format: "markdown" | "tiptap_json" | "both" = "markdown",
	publicBaseUrl?: string,
) {
	const { results } = await db
		.prepare("SELECT * FROM docs WHERE is_deleted = 0 ORDER BY sort_order ASC, created_at ASC")
		.all<DocRow>();
	const allActive = results ?? [];
	const map = new Map(allActive.map((d) => [d.id, d]));
	const target = map.get(id);
	if (!target) return null;

	// Build breadcrumbs from root to target
	const breadcrumbs: { id: string; title: string; emoji: string | null }[] = [];
	const visited = new Set<string>();
	let curr: DocRow | undefined = target;
	while (curr && !visited.has(curr.id)) {
		visited.add(curr.id);
		breadcrumbs.unshift({ id: curr.id, title: curr.title, emoji: curr.emoji });
		curr = curr.parent_id ? map.get(curr.parent_id) : undefined;
	}

	const children = allActive
		.filter((d) => d.parent_id === target.id)
		.map((d) => toDocSummary(d, publicBaseUrl));

	let parsedJson: unknown = null;
	try {
		parsedJson = JSON.parse(target.content);
	} catch {
		parsedJson = null;
	}

	return {
		...toDocSummary(target, publicBaseUrl),
		breadcrumbs,
		children,
		...(format === "markdown" || format === "both"
			? { markdown: jsonToMarkdown(target.title, target.content) }
			: {}),
		...(format === "tiptap_json" || format === "both" ? { tiptapJson: parsedJson } : {}),
	};
}

function makeSnippet(text: string, queryLower: string): string {
	if (!text) return "";
	const idx = text.toLowerCase().indexOf(queryLower);
	if (idx === -1) return text.slice(0, 160);
	const start = Math.max(0, idx - 60);
	const end = Math.min(text.length, idx + queryLower.length + 100);
	return `${start > 0 ? "..." : ""}${text.slice(start, end)}${end < text.length ? "..." : ""}`;
}

export async function searchActiveDocs(
	db: D1Database,
	query: string,
	limit = 20,
	publicBaseUrl?: string,
) {
	const trimmed = query.trim();
	const qLower = trimmed.toLowerCase();
	const { results } = await db
		.prepare("SELECT * FROM docs WHERE is_deleted = 0 ORDER BY updated_at DESC")
		.all<DocRow>();

	const matches: Array<DocSummary & { matchedIn: ("title" | "content")[]; snippet: string }> = [];
	for (const row of results ?? []) {
		const titleMatch = row.title.toLowerCase().includes(qLower);
		const plain = extractPlainText(row.content);
		const contentMatch = plain.toLowerCase().includes(qLower);
		if (titleMatch || contentMatch) {
			const matchedIn: ("title" | "content")[] = [];
			if (titleMatch) matchedIn.push("title");
			if (contentMatch) matchedIn.push("content");
			matches.push({
				...toDocSummary(row, publicBaseUrl),
				matchedIn,
				snippet: makeSnippet(plain, qLower),
			});
			if (matches.length >= limit) break;
		}
	}
	return matches;
}

function resolveContentInput(input: {
	markdown?: string;
	tiptapJson?: unknown;
}): { ok: true; serialized: string; wordCount: number } | { ok: false; error: string } {
	if (input.markdown !== undefined && input.tiptapJson !== undefined) {
		return { ok: false, error: "Provide either markdown or tiptap_json, not both" };
	}
	if (input.tiptapJson !== undefined) {
		const validated = validateTiptapJson(input.tiptapJson);
		if (!validated.ok) return validated;
		const wordCount = countWords(extractPlainText(validated.serialized));
		return { ok: true, serialized: validated.serialized, wordCount };
	}
	if (input.markdown !== undefined) {
		const doc = markdownToTiptapJson(input.markdown);
		const serialized = JSON.stringify(doc);
		const wordCount = countWords(extractPlainText(serialized));
		return { ok: true, serialized, wordCount };
	}
	const empty = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
	return { ok: true, serialized: empty, wordCount: 0 };
}

export async function createDoc(
	db: D1Database,
	input: {
		title?: string;
		parentId?: string | null;
		emoji?: string | null;
		markdown?: string;
		tiptapJson?: unknown;
		publicBaseUrl?: string;
	},
) {
	const parentId = input.parentId ?? null;
	if (parentId !== null) {
		const parent = await db
			.prepare("SELECT id, is_deleted FROM docs WHERE id = ?")
			.bind(parentId)
			.first<{ id: string; is_deleted: number }>();
		if (!parent || parent.is_deleted === 1) {
			throw new Error(`Parent document not found or deleted: ${parentId}`);
		}
	}

	const resolved = resolveContentInput({
		markdown: input.markdown,
		tiptapJson: input.tiptapJson,
	});
	if (!resolved.ok) throw new Error(resolved.error);

	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	const title = input.title?.trim() || "无标题文档";
	const maxRow = await db
		.prepare("SELECT COALESCE(MAX(sort_order), -1) as max_order FROM docs WHERE is_deleted = 0")
		.first<{ max_order: number }>();
	const sortOrder = (maxRow?.max_order ?? -1) + 1;

	await db
		.prepare(
			`INSERT INTO docs (id, parent_id, title, emoji, cover, content, is_favorite, is_deleted, sort_order, word_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, 0, 0, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			parentId,
			title,
			input.emoji ?? null,
			resolved.serialized,
			sortOrder,
			resolved.wordCount,
			now,
			now,
		)
		.run();

	const created = await db.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
	if (!created) throw new Error("Failed to read created document");
	return toDocSummary(created, input.publicBaseUrl);
}

export async function updateDoc(
	db: D1Database,
	id: string,
	input: {
		title?: string;
		emoji?: string | null;
		markdown?: string;
		tiptapJson?: unknown;
		isFavorite?: boolean;
		publicBaseUrl?: string;
	},
) {
	const existing = await db.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
	if (!existing || existing.is_deleted === 1) {
		throw new Error(`Document not found or deleted: ${id}`);
	}

	if (input.markdown !== undefined && input.tiptapJson !== undefined) {
		throw new Error("Provide either markdown or tiptap_json, not both");
	}

	let content = existing.content;
	let wordCount = existing.word_count;
	if (input.markdown !== undefined || input.tiptapJson !== undefined) {
		const resolved = resolveContentInput({
			markdown: input.markdown,
			tiptapJson: input.tiptapJson,
		});
		if (!resolved.ok) throw new Error(resolved.error);
		content = resolved.serialized;
		wordCount = resolved.wordCount;
	}

	const now = new Date().toISOString();
	const title = input.title !== undefined ? input.title : existing.title;
	const emoji = input.emoji !== undefined ? input.emoji : existing.emoji;
	const isFavorite =
		input.isFavorite !== undefined ? (input.isFavorite ? 1 : 0) : existing.is_favorite;

	await db
		.prepare(
			`UPDATE docs
       SET title = ?, emoji = ?, content = ?, is_favorite = ?, word_count = ?, updated_at = ?
       WHERE id = ?`,
		)
		.bind(title, emoji, content, isFavorite, wordCount, now, id)
		.run();

	const updated = await db.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
	if (!updated) throw new Error("Failed to read updated document");
	return toDocSummary(updated, input.publicBaseUrl);
}

export async function appendDoc(
	db: D1Database,
	id: string,
	input: {
		markdown?: string;
		tiptapJson?: unknown;
		publicBaseUrl?: string;
	},
) {
	const existing = await db.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
	if (!existing || existing.is_deleted === 1) {
		throw new Error(`Document not found or deleted: ${id}`);
	}

	if (input.markdown !== undefined && input.tiptapJson !== undefined) {
		throw new Error("Provide either markdown or tiptap_json, not both");
	}
	if (input.markdown === undefined && input.tiptapJson === undefined) {
		throw new Error("Either markdown or tiptap_json must be provided");
	}

	let nodesToAppend: TiptapNode[] = [];
	if (input.markdown !== undefined) {
		nodesToAppend = markdownToTiptapJson(input.markdown).content;
	} else {
		const validated = validateTiptapJson(input.tiptapJson);
		if (!validated.ok) throw new Error(validated.error);
		nodesToAppend = validated.doc.content;
	}

	const nextDoc = appendTiptapNodes(existing.content, nodesToAppend);
	const serialized = JSON.stringify(nextDoc);
	const wordCount = countWords(extractPlainText(serialized));
	const now = new Date().toISOString();

	await db
		.prepare("UPDATE docs SET content = ?, word_count = ?, updated_at = ? WHERE id = ?")
		.bind(serialized, wordCount, now, id)
		.run();

	const updated = await db.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
	if (!updated) throw new Error("Failed to read updated document");
	return toDocSummary(updated, input.publicBaseUrl);
}

export async function moveDoc(
	db: D1Database,
	id: string,
	parentId: string | null,
	sortOrder?: number,
	publicBaseUrl?: string,
) {
	const existing = await db.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
	if (!existing || existing.is_deleted === 1) {
		throw new Error(`Document not found or deleted: ${id}`);
	}

	if (parentId === id) {
		throw new Error("Cannot move a document into itself");
	}

	if (parentId !== null) {
		const { results } = await db
			.prepare("SELECT id, parent_id, is_deleted FROM docs")
			.all<{ id: string; parent_id: string | null; is_deleted: number }>();
		const map = new Map((results ?? []).map((r) => [r.id, r]));
		const parent = map.get(parentId);
		if (!parent || parent.is_deleted === 1) {
			throw new Error(`Target parent document not found or deleted: ${parentId}`);
		}

		// Walk up from parentId to ensure id is not an ancestor (prevent cycle)
		let curr: { id: string; parent_id: string | null } | undefined = parent;
		const visited = new Set<string>();
		while (curr && !visited.has(curr.id)) {
			if (curr.id === id) {
				throw new Error("Cannot move a document under one of its descendants");
			}
			visited.add(curr.id);
			curr = curr.parent_id ? map.get(curr.parent_id) : undefined;
		}
	}

	const now = new Date().toISOString();
	const nextSortOrder = sortOrder !== undefined ? sortOrder : existing.sort_order;
	await db
		.prepare("UPDATE docs SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ?")
		.bind(parentId, nextSortOrder, now, id)
		.run();

	const updated = await db.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
	if (!updated) throw new Error("Failed to read moved document");
	return toDocSummary(updated, publicBaseUrl);
}

export async function softDeleteDoc(db: D1Database, id: string): Promise<{ ids: string[] }> {
	const existing = await db.prepare("SELECT id FROM docs WHERE id = ?").bind(id).first<{ id: string }>();
	if (!existing) {
		throw new Error(`Document not found: ${id}`);
	}

	const { results: allRows } = await db.prepare("SELECT id, parent_id FROM docs").all<{
		id: string;
		parent_id: string | null;
	}>();
	const childrenMap = new Map<string, string[]>();
	for (const r of allRows ?? []) {
		if (r.parent_id) {
			const list = childrenMap.get(r.parent_id) ?? [];
			list.push(r.id);
			childrenMap.set(r.parent_id, list);
		}
	}

	const idsToDelete: string[] = [];
	const queue = [id];
	const visited = new Set<string>();
	while (queue.length > 0) {
		const curr = queue.shift()!;
		if (visited.has(curr)) continue;
		visited.add(curr);
		idsToDelete.push(curr);
		const kids = childrenMap.get(curr) ?? [];
		queue.push(...kids);
	}

	const now = new Date().toISOString();
	await db.batch(
		idsToDelete.map((targetId) =>
			db
				.prepare("UPDATE docs SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?")
				.bind(now, now, targetId),
		),
	);

	return { ids: idsToDelete };
}

export async function restoreDoc(db: D1Database, id: string, publicBaseUrl?: string) {
	const doc = await db.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
	if (!doc) {
		throw new Error(`Document not found: ${id}`);
	}

	let parentId = doc.parent_id;
	if (parentId) {
		const parent = await db
			.prepare("SELECT id, is_deleted FROM docs WHERE id = ?")
			.bind(parentId)
			.first<{ id: string; is_deleted: number }>();
		if (!parent || parent.is_deleted === 1) {
			parentId = null;
		}
	}

	const now = new Date().toISOString();
	await db
		.prepare("UPDATE docs SET is_deleted = 0, deleted_at = NULL, parent_id = ?, updated_at = ? WHERE id = ?")
		.bind(parentId, now, id)
		.run();

	const restored = await db.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
	if (!restored) throw new Error("Failed to read restored document");
	return toDocSummary(restored, publicBaseUrl);
}
