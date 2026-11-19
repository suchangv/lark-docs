import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
	appendDoc,
	createDoc,
	getDocWithContext,
	listActiveDocs,
	moveDoc,
	restoreDoc,
	searchActiveDocs,
	softDeleteDoc,
	updateDoc,
} from "./docService";
import { mcpJsonResponse, withMcpHeaders, type McpAuthEnv } from "./mcpAuth";

export interface McpEnv extends McpAuthEnv {
	DB: D1Database;
	DOC_PUBLIC_BASE_URL?: string;
}

function okResult(data: unknown) {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
	};
}

function errResult(err: unknown) {
	const message = err instanceof Error ? err.message : String(err);
	return {
		isError: true,
		content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
	};
}

function createMcpServer(env: McpEnv): McpServer {
	const server = new McpServer({
		name: "lark-docs-mcp",
		version: "1.0.0",
	});

	const baseUrl = env.DOC_PUBLIC_BASE_URL;

	server.tool(
		"list_docs",
		"List non-deleted documents in Lark Docs, optionally filtered by parent_id (pass null for root documents).",
		{
			parent_id: z
				.string()
				.nullable()
				.optional()
				.describe("Optional parent document ID; omit for all active docs, null for root docs only"),
		},
		async ({ parent_id }) => {
			try {
				const docs = await listActiveDocs(env.DB, {
					parentId: parent_id,
					publicBaseUrl: baseUrl,
				});
				return okResult({ count: docs.length, docs });
			} catch (err) {
				return errResult(err);
			}
		},
	);

	server.tool(
		"get_doc",
		"Get a single non-deleted document by ID with its breadcrumbs, direct child documents, and content in markdown, tiptap_json, or both.",
		{
			id: z.string().min(1).describe("Document ID"),
			format: z
				.enum(["markdown", "tiptap_json", "both"])
				.optional()
				.default("markdown")
				.describe("Content format to return (default: markdown)"),
		},
		async ({ id, format }) => {
			try {
				const doc = await getDocWithContext(env.DB, id, format, baseUrl);
				if (!doc) {
					return errResult(new Error(`Document not found or deleted: ${id}`));
				}
				return okResult(doc);
			} catch (err) {
				return errResult(err);
			}
		},
	);

	server.tool(
		"search_docs",
		"Search non-deleted documents by keyword across titles and plain-text content.",
		{
			query: z.string().min(1).describe("Search keyword"),
			limit: z
				.number()
				.int()
				.min(1)
				.max(100)
				.optional()
				.default(20)
				.describe("Maximum number of results to return (1-100, default 20)"),
		},
		async ({ query, limit }) => {
			try {
				const results = await searchActiveDocs(env.DB, query, limit, baseUrl);
				return okResult({ query, count: results.length, results });
			} catch (err) {
				return errResult(err);
			}
		},
	);

	server.tool(
		"create_doc",
		"Create a new document with optional parent_id, emoji, and content as markdown or tiptap_json.",
		{
			title: z.string().optional().describe("Document title (default: 无标题文档)"),
			parent_id: z.string().nullable().optional().describe("Parent document ID, or null for root"),
			emoji: z.string().nullable().optional().describe("Optional emoji icon"),
			markdown: z.string().optional().describe("Document body in Markdown"),
			tiptap_json: z
				.unknown()
				.optional()
				.describe("Document body as Tiptap/ProseMirror JSON object or JSON string"),
		},
		async ({ title, parent_id, emoji, markdown, tiptap_json }) => {
			try {
				const doc = await createDoc(env.DB, {
					title,
					parentId: parent_id,
					emoji,
					markdown,
					tiptapJson: tiptap_json,
					publicBaseUrl: baseUrl,
				});
				return okResult({ doc });
			} catch (err) {
				return errResult(err);
			}
		},
	);

	server.tool(
		"update_doc",
		"Update an existing non-deleted document's title, emoji, favorite status, or full body (markdown or tiptap_json).",
		{
			id: z.string().min(1).describe("Document ID"),
			title: z.string().optional().describe("New title"),
			emoji: z.string().nullable().optional().describe("New emoji icon (or null to clear)"),
			is_favorite: z.boolean().optional().describe("Whether the document is favorited"),
			markdown: z.string().optional().describe("Replacement body in Markdown"),
			tiptap_json: z
				.unknown()
				.optional()
				.describe("Replacement body as Tiptap/ProseMirror JSON object or JSON string"),
		},
		async ({ id, title, emoji, is_favorite, markdown, tiptap_json }) => {
			try {
				const doc = await updateDoc(env.DB, id, {
					title,
					emoji,
					isFavorite: is_favorite,
					markdown,
					tiptapJson: tiptap_json,
					publicBaseUrl: baseUrl,
				});
				return okResult({ doc });
			} catch (err) {
				return errResult(err);
			}
		},
	);

	server.tool(
		"append_doc",
		"Append Markdown or Tiptap JSON nodes to the end of an existing non-deleted document.",
		{
			id: z.string().min(1).describe("Document ID"),
			markdown: z.string().optional().describe("Markdown content to append"),
			tiptap_json: z
				.unknown()
				.optional()
				.describe("Tiptap/ProseMirror doc JSON whose content nodes will be appended"),
		},
		async ({ id, markdown, tiptap_json }) => {
			try {
				const doc = await appendDoc(env.DB, id, {
					markdown,
					tiptapJson: tiptap_json,
					publicBaseUrl: baseUrl,
				});
				return okResult({ doc });
			} catch (err) {
				return errResult(err);
			}
		},
	);

	server.tool(
		"move_doc",
		"Move a non-deleted document to a new parent_id (or null for root) and/or update sort_order. Rejects moving into self or descendants.",
		{
			id: z.string().min(1).describe("Document ID to move"),
			parent_id: z.string().nullable().describe("Target parent document ID, or null for root"),
			sort_order: z.number().int().optional().describe("Optional new sort order"),
		},
		async ({ id, parent_id, sort_order }) => {
			try {
				const doc = await moveDoc(env.DB, id, parent_id, sort_order, baseUrl);
				return okResult({ doc });
			} catch (err) {
				return errResult(err);
			}
		},
	);

	server.tool(
		"delete_doc",
		"Soft-delete a document and all of its descendants (moves to trash; never permanently deletes).",
		{
			id: z.string().min(1).describe("Document ID to soft-delete"),
		},
		async ({ id }) => {
			try {
				const result = await softDeleteDoc(env.DB, id);
				return okResult({ ok: true, deletedIds: result.ids });
			} catch (err) {
				return errResult(err);
			}
		},
	);

	server.tool(
		"restore_doc",
		"Restore a soft-deleted document from trash. If its original parent is missing or deleted, it is restored at root.",
		{
			id: z.string().min(1).describe("Document ID to restore"),
		},
		async ({ id }) => {
			try {
				const doc = await restoreDoc(env.DB, id, baseUrl);
				return okResult({ doc });
			} catch (err) {
				return errResult(err);
			}
		},
	);

	return server;
}

export async function handleMcpRequest(request: Request, env: McpEnv): Promise<Response> {
	const server = createMcpServer(env);
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true,
	});

	try {
		await server.connect(transport);
		const response = await transport.handleRequest(request);
		return withMcpHeaders(response, request, env);
	} catch (err) {
		return mcpJsonResponse(
			{ error: err instanceof Error ? err.message : "Internal Server Error" },
			500,
			request,
			env,
		);
	} finally {
		await transport.close().catch(() => {});
		await server.close().catch(() => {});
	}
}
