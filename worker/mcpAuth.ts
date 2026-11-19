export interface McpAuthEnv {
	MCP_HOST?: string;
	MCP_API_KEY?: string;
	MCP_API_KEY_PREVIOUS?: string;
	MCP_CORS_ORIGINS?: string;
}

const encoder = new TextEncoder();

export function buildMcpCorsHeaders(request: Request, env: McpAuthEnv): Record<string, string> {
	const configured = (env.MCP_CORS_ORIGINS ?? "*").trim();
	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "POST,GET,DELETE,OPTIONS",
		"Access-Control-Allow-Headers":
			"Content-Type,Authorization,X-API-Key,Mcp-Session-Id,Mcp-Protocol-Version,Accept",
		"Access-Control-Expose-Headers": "Mcp-Session-Id,Mcp-Protocol-Version",
		"Access-Control-Max-Age": "86400",
		"X-Robots-Tag": "noindex",
		"Cache-Control": "no-store",
	};

	if (configured === "*" || configured === "") {
		headers["Access-Control-Allow-Origin"] = "*";
	} else {
		const allowList = configured
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		const origin = request.headers.get("Origin");
		if (origin && allowList.includes(origin)) {
			headers["Access-Control-Allow-Origin"] = origin;
		}
		headers["Vary"] = "Origin";
	}

	return headers;
}

export function withMcpHeaders(response: Response, request: Request, env: McpAuthEnv): Response {
	const headers = new Headers(response.headers);
	const mcpHeaders = buildMcpCorsHeaders(request, env);
	for (const [k, v] of Object.entries(mcpHeaders)) {
		headers.set(k, v);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export function mcpJsonResponse(
	body: unknown,
	status: number,
	request: Request,
	env: McpAuthEnv,
	extraHeaders?: Record<string, string>,
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...buildMcpCorsHeaders(request, env),
			...extraHeaders,
		},
	});
}

function extractApiKey(request: Request): string | null {
	const authHeader = request.headers.get("Authorization");
	if (authHeader) {
		const match = authHeader.match(/^Bearer\s+(.+)$/i);
		if (match && match[1].trim()) {
			return match[1].trim();
		}
	}
	const xApiKey = request.headers.get("X-API-Key");
	if (xApiKey && xApiKey.trim()) {
		return xApiKey.trim();
	}
	return null;
}

async function sha256(value: string): Promise<ArrayBuffer> {
	return crypto.subtle.digest("SHA-256", encoder.encode(value));
}

async function timingSafeKeyMatch(candidateHash: ArrayBuffer, expectedKey: string): Promise<boolean> {
	const expectedHash = await sha256(expectedKey);
	return crypto.subtle.timingSafeEqual(candidateHash, expectedHash);
}

export type McpAuthResult =
	| { ok: true }
	| { ok: false; response: Response };

export async function authenticateMcp(request: Request, env: McpAuthEnv): Promise<McpAuthResult> {
	const primaryKey = env.MCP_API_KEY?.trim();
	if (!primaryKey) {
		return {
			ok: false,
			response: mcpJsonResponse(
				{ error: "MCP API key is not configured" },
				503,
				request,
				env,
				{ "WWW-Authenticate": 'Bearer realm="lark-docs-mcp"' },
			),
		};
	}

	const providedKey = extractApiKey(request);
	if (!providedKey) {
		return {
			ok: false,
			response: mcpJsonResponse(
				{ error: "Missing API key" },
				401,
				request,
				env,
				{ "WWW-Authenticate": 'Bearer realm="lark-docs-mcp"' },
			),
		};
	}

	const candidateHash = await sha256(providedKey);
	const matchesPrimary = await timingSafeKeyMatch(candidateHash, primaryKey);
	const previousKey = env.MCP_API_KEY_PREVIOUS?.trim();
	const matchesPrevious = previousKey ? await timingSafeKeyMatch(candidateHash, previousKey) : false;

	if (!matchesPrimary && !matchesPrevious) {
		return {
			ok: false,
			response: mcpJsonResponse(
				{ error: "Invalid API key" },
				401,
				request,
				env,
				{ "WWW-Authenticate": 'Bearer realm="lark-docs-mcp"' },
			),
		};
	}

	return { ok: true };
}
