import { authenticate, type AccessEnv } from "./access";
import { handleMcpRequest, type McpEnv } from "./mcp";
import { authenticateMcp, buildMcpCorsHeaders, mcpJsonResponse } from "./mcpAuth";
import { seedInitialDocsIfEmpty } from "./seed";

interface Env extends AccessEnv, McpEnv {
	DB: D1Database;
	ASSETS: Fetcher;
}

interface DocRow {
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

const SECURITY_HEADERS: Record<string, string> = {
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "no-referrer",
	"X-Robots-Tag": "noindex, nofollow, noarchive",
	"Strict-Transport-Security": "max-age=15552000",
	"Content-Security-Policy":
		"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
};

function withSecurityHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
		headers.set(k, v);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
			...SECURITY_HEADERS,
		},
	});
}

function authErrorPage(status: number, reason: string): Response {
	const html = `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>访问受限 — Lark Docs</title>
<style>
  body { margin:0; min-height:100dvh; display:grid; place-items:center; background:#f5f6f7; color:#1f2329;
    font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; padding:24px; }
  .card { width:min(440px,100%); background:#fff; border:1px solid #dee0e3; border-radius:12px; padding:28px;
    box-shadow:0 8px 24px rgba(31,35,41,0.08); }
  h1 { margin:0 0 8px; font-size:18px; }
  p { margin:0 0 14px; color:#646a73; font-size:13.5px; }
  code { background:#f2f3f5; padding:2px 6px; border-radius:4px; font-size:12px; }
  .actions { display:flex; gap:10px; margin-top:18px; }
  a { display:inline-flex; align-items:center; height:36px; padding:0 14px; border-radius:8px; font-size:13.5px;
    font-weight:500; text-decoration:none; }
  .primary { background:#3370ff; color:#fff; }
  .ghost { background:#f5f6f7; color:#1f2329; border:1px solid #dee0e3; }
</style>
<div class="card">
  <h1>需要身份验证</h1>
  <p>此文档站受 Cloudflare Access 零信任保护，请通过授权的 Google 账号登录后访问。</p>
  <p>状态：<code>${status} · ${reason}</code></p>
  <div class="actions">
    <a class="primary" href="/">重新验证</a>
    <a class="ghost" href="/cdn-cgi/access/logout">切换账号</a>
  </div>
</div>
</html>`;
	return new Response(html, {
		status,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
			...SECURITY_HEADERS,
			"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
		},
	});
}

function serializeDoc(row: DocRow) {
	return {
		id: row.id,
		parentId: row.parent_id,
		title: row.title,
		emoji: row.emoji,
		cover: row.cover,
		content: row.content,
		isFavorite: row.is_favorite === 1,
		isDeleted: row.is_deleted === 1,
		deletedAt: row.deleted_at,
		sortOrder: row.sort_order,
		wordCount: row.word_count,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

async function handleApi(request: Request, env: Env, path: string, identity: { email: string; authMethod?: string; expiresAt: number }): Promise<Response> {
	if (path === "/api/me" && request.method === "GET") {
		return json({
			email: identity.email,
			authMethod: identity.authMethod ?? "access",
			expiresAt: identity.expiresAt,
		});
	}

	if (path === "/api/docs" && request.method === "GET") {
		await seedInitialDocsIfEmpty(env.DB);
		const url = new URL(request.url);
		const trash = url.searchParams.get("trash") === "1";
		const { results } = await env.DB.prepare(
			trash
				? "SELECT * FROM docs WHERE is_deleted = 1 ORDER BY deleted_at DESC, updated_at DESC"
				: "SELECT * FROM docs WHERE is_deleted = 0 ORDER BY sort_order ASC, created_at ASC",
		).all<DocRow>();
		return json({ docs: (results ?? []).map(serializeDoc) });
	}

	if (path === "/api/docs" && request.method === "POST") {
		const body = (await request.json().catch(() => ({}))) as {
			id?: string;
			parentId?: string | null;
			title?: string;
			emoji?: string | null;
			cover?: string | null;
			content?: string;
			sortOrder?: number;
			wordCount?: number;
		};
		const id = body.id?.trim() || crypto.randomUUID();
		const now = new Date().toISOString();
		const title = typeof body.title === "string" ? body.title : "无标题文档";
		const content = typeof body.content === "string" ? body.content : JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

		let sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;
		if (typeof body.sortOrder !== "number") {
			const maxRow = await env.DB.prepare(
				"SELECT COALESCE(MAX(sort_order), -1) as max_order FROM docs WHERE is_deleted = 0",
			).first<{ max_order: number }>();
			sortOrder = (maxRow?.max_order ?? -1) + 1;
		}

		await env.DB.prepare(
			`INSERT INTO docs (id, parent_id, title, emoji, cover, content, is_favorite, is_deleted, sort_order, word_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
		)
			.bind(
				id,
				body.parentId ?? null,
				title,
				body.emoji ?? null,
				body.cover ?? null,
				content,
				sortOrder,
				body.wordCount ?? 0,
				now,
				now,
			)
			.run();

		const created = await env.DB.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
		return json({ doc: created ? serializeDoc(created) : null }, 201);
	}

	const restoreMatch = path.match(/^\/api\/docs\/([^/]+)\/restore$/);
	if (restoreMatch && request.method === "POST") {
		const id = decodeURIComponent(restoreMatch[1]);
		const doc = await env.DB.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
		if (!doc) return json({ error: "Not found" }, 404);

		let parentId = doc.parent_id;
		if (parentId) {
			const parent = await env.DB.prepare("SELECT id, is_deleted FROM docs WHERE id = ?")
				.bind(parentId)
				.first<{ id: string; is_deleted: number }>();
			if (!parent || parent.is_deleted === 1) {
				parentId = null;
			}
		}

		const now = new Date().toISOString();
		await env.DB.prepare(
			"UPDATE docs SET is_deleted = 0, deleted_at = NULL, parent_id = ?, updated_at = ? WHERE id = ?",
		)
			.bind(parentId, now, id)
			.run();

		const updated = await env.DB.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
		return json({ doc: updated ? serializeDoc(updated) : null });
	}

	const duplicateMatch = path.match(/^\/api\/docs\/([^/]+)\/duplicate$/);
	if (duplicateMatch && request.method === "POST") {
		const id = decodeURIComponent(duplicateMatch[1]);
		const source = await env.DB.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
		if (!source) return json({ error: "Not found" }, 404);

		const newId = crypto.randomUUID();
		const now = new Date().toISOString();
		const maxRow = await env.DB.prepare(
			"SELECT COALESCE(MAX(sort_order), -1) as max_order FROM docs WHERE is_deleted = 0",
		).first<{ max_order: number }>();
		const sortOrder = (maxRow?.max_order ?? -1) + 1;

		await env.DB.prepare(
			`INSERT INTO docs (id, parent_id, title, emoji, cover, content, is_favorite, is_deleted, sort_order, word_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
		)
			.bind(
				newId,
				source.parent_id,
				`${source.title || "无标题文档"} (副本)`,
				source.emoji,
				source.cover,
				source.content,
				sortOrder,
				source.word_count,
				now,
				now,
			)
			.run();

		const created = await env.DB.prepare("SELECT * FROM docs WHERE id = ?").bind(newId).first<DocRow>();
		return json({ doc: created ? serializeDoc(created) : null }, 201);
	}

	const docMatch = path.match(/^\/api\/docs\/([^/]+)$/);
	if (docMatch) {
		const id = decodeURIComponent(docMatch[1]);

		if (request.method === "GET") {
			const row = await env.DB.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
			if (!row) return json({ error: "Not found" }, 404);
			return json({ doc: serializeDoc(row) });
		}

		if (request.method === "PATCH") {
			const existing = await env.DB.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
			if (!existing) return json({ error: "Not found" }, 404);

			const body = (await request.json().catch(() => ({}))) as {
				title?: string;
				emoji?: string | null;
				cover?: string | null;
				content?: string;
				parentId?: string | null;
				isFavorite?: boolean;
				sortOrder?: number;
				wordCount?: number;
			};

			const now = new Date().toISOString();
			const title = body.title !== undefined ? body.title : existing.title;
			const emoji = body.emoji !== undefined ? body.emoji : existing.emoji;
			const cover = body.cover !== undefined ? body.cover : existing.cover;
			const content = body.content !== undefined ? body.content : existing.content;
			const parentId = body.parentId !== undefined ? body.parentId : existing.parent_id;
			const isFavorite = body.isFavorite !== undefined ? (body.isFavorite ? 1 : 0) : existing.is_favorite;
			const sortOrder = body.sortOrder !== undefined ? body.sortOrder : existing.sort_order;
			const wordCount = body.wordCount !== undefined ? body.wordCount : existing.word_count;

			await env.DB.prepare(
				`UPDATE docs
         SET title = ?, emoji = ?, cover = ?, content = ?, parent_id = ?, is_favorite = ?, sort_order = ?, word_count = ?, updated_at = ?
         WHERE id = ?`,
			)
				.bind(title, emoji, cover, content, parentId, isFavorite, sortOrder, wordCount, now, id)
				.run();

			const updated = await env.DB.prepare("SELECT * FROM docs WHERE id = ?").bind(id).first<DocRow>();
			return json({ doc: updated ? serializeDoc(updated) : null });
		}

		if (request.method === "DELETE") {
			const url = new URL(request.url);
			const permanent = url.searchParams.get("permanent") === "1";

			// Collect doc + all descendants
			const { results: allRows } = await env.DB.prepare("SELECT id, parent_id FROM docs").all<{
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
			while (queue.length > 0) {
				const curr = queue.shift()!;
				idsToDelete.push(curr);
				const kids = childrenMap.get(curr) ?? [];
				queue.push(...kids);
			}

			if (permanent) {
				await env.DB.batch(
					idsToDelete.map((targetId) =>
						env.DB.prepare("DELETE FROM docs WHERE id = ?").bind(targetId),
					),
				);
			} else {
				const now = new Date().toISOString();
				await env.DB.batch(
					idsToDelete.map((targetId) =>
						env.DB.prepare(
							"UPDATE docs SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?",
						).bind(now, now, targetId),
					),
				);
			}

			return json({ ok: true, ids: idsToDelete });
		}
	}

	return json({ error: "Not found" }, 404);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const hostHeader = request.headers.get("Host")?.split(":")[0]?.toLowerCase();
		const isLocalDev = url.hostname === "127.0.0.1" || url.hostname === "localhost";
		const isMcpHost = Boolean(
			env.MCP_HOST &&
				(url.hostname === env.MCP_HOST || (isLocalDev && hostHeader === env.MCP_HOST)),
		);
		if (isMcpHost) {
			if (request.method === "OPTIONS") {
				return new Response(null, {
					status: 204,
					headers: buildMcpCorsHeaders(request, env),
				});
			}
			if (url.pathname === "/health" && request.method === "GET") {
				return mcpJsonResponse({ ok: true, service: "lark-docs-mcp" }, 200, request, env);
			}
			if (
				url.pathname === "/mcp" &&
				(request.method === "POST" || request.method === "GET" || request.method === "DELETE")
			) {
				const mcpAuth = await authenticateMcp(request, env);
				if (!mcpAuth.ok) {
					return mcpAuth.response;
				}
				return handleMcpRequest(request, env);
			}
			return mcpJsonResponse({ error: "Not found" }, 404, request, env);
		}

		const auth = await authenticate(request, env);
		if (!auth.ok) {
			if (url.pathname.startsWith("/api/")) {
				return json({ error: auth.reason }, auth.status);
			}
			return authErrorPage(auth.status, auth.reason);
		}

		if (url.pathname.startsWith("/api/")) {
			try {
				return await handleApi(request, env, url.pathname, auth.identity);
			} catch (err) {
				return json(
					{ error: err instanceof Error ? err.message : "Internal Server Error" },
					500,
				);
			}
		}

		if (request.method !== "GET" && request.method !== "HEAD") {
			return json({ error: "Method not allowed" }, 405);
		}

		const assetRes = await env.ASSETS.fetch(request);
		if (assetRes.status === 404 && !url.pathname.includes(".")) {
			const indexRes = await env.ASSETS.fetch(new Request(new URL("/", request.url), request));
			return withSecurityHeaders(indexRes);
		}
		return withSecurityHeaders(assetRes);
	},
};
