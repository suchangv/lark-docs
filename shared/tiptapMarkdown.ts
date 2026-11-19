export interface TiptapMark {
	type: string;
	attrs?: Record<string, unknown>;
}

export interface TiptapNode {
	type: string;
	attrs?: Record<string, unknown>;
	content?: TiptapNode[];
	text?: string;
	marks?: TiptapMark[];
}

export interface TiptapDoc {
	type: "doc";
	content: TiptapNode[];
}

export function extractPlainText(contentJson: string): string {
	if (!contentJson) return "";
	try {
		const parsed = JSON.parse(contentJson) as { content?: unknown[] };
		const parts: string[] = [];
		const walk = (node: unknown) => {
			if (!node || typeof node !== "object") return;
			const n = node as { text?: string; content?: unknown[] };
			if (typeof n.text === "string") parts.push(n.text);
			if (Array.isArray(n.content)) {
				for (const child of n.content) walk(child);
				parts.push(" ");
			}
		};
		walk(parsed);
		return parts.join("").replace(/\s+/g, " ").trim();
	} catch {
		return contentJson.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
	}
}

export function countWords(text: string): number {
	const cleaned = text.trim();
	if (!cleaned) return 0;
	// Count CJK characters + non-CJK words
	const cjk = cleaned.match(/[\u4e00-\u9fa5]/g)?.length ?? 0;
	const nonCjk = cleaned
		.replace(/[\u4e00-\u9fa5]/g, " ")
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
	return cjk + nonCjk;
}

export function jsonToMarkdown(title: string, contentJson: string): string {
	let doc: { content?: unknown[] } = {};
	try {
		doc = JSON.parse(contentJson);
	} catch {
		return `# ${title}\n\n`;
	}

	const renderInline = (nodes?: unknown[]): string => {
		if (!Array.isArray(nodes)) return "";
		return nodes
			.map((raw) => {
				const n = raw as {
					type?: string;
					text?: string;
					marks?: { type: string; attrs?: { href?: string } }[];
				};
				if (n.type === "hardBreak") return "\n";
				let text = n.text ?? "";
				if (Array.isArray(n.marks)) {
					for (const m of n.marks) {
						if (m.type === "bold") text = `**${text}**`;
						else if (m.type === "italic") text = `*${text}*`;
						else if (m.type === "strike") text = `~~${text}~~`;
						else if (m.type === "code") text = `\`${text}\``;
						else if (m.type === "link" && m.attrs?.href) text = `[${text}](${m.attrs.href})`;
					}
				}
				return text;
			})
			.join("");
	};

	const renderBlock = (raw: unknown, indent = ""): string => {
		const n = raw as {
			type?: string;
			attrs?: Record<string, unknown>;
			content?: unknown[];
		};
		switch (n.type) {
			case "heading": {
				const level = Number(n.attrs?.level ?? 1);
				return `${"#".repeat(level)} ${renderInline(n.content)}\n\n`;
			}
			case "paragraph":
				return `${indent}${renderInline(n.content)}\n\n`;
			case "bulletList":
				return (
					(n.content ?? [])
						.map((item) => {
							const li = item as { content?: unknown[] };
							const inner = (li.content ?? [])
								.map((c, idx) =>
									idx === 0 ? renderBlock(c).trimEnd() : renderBlock(c, "  ").trimEnd(),
								)
								.join("\n");
							return `${indent}- ${inner}`;
						})
						.join("\n") + "\n\n"
				);
			case "orderedList":
				return (
					(n.content ?? [])
						.map((item, idx) => {
							const li = item as { content?: unknown[] };
							const inner = (li.content ?? []).map((c) => renderBlock(c).trimEnd()).join("\n");
							return `${indent}${idx + 1}. ${inner}`;
						})
						.join("\n") + "\n\n"
				);
			case "taskList":
				return (
					(n.content ?? [])
						.map((item) => {
							const ti = item as { attrs?: { checked?: boolean }; content?: unknown[] };
							const mark = ti.attrs?.checked ? "x" : " ";
							const inner = (ti.content ?? []).map((c) => renderBlock(c).trimEnd()).join(" ");
							return `${indent}- [${mark}] ${inner}`;
						})
						.join("\n") + "\n\n"
				);
			case "blockquote":
				return (
					(n.content ?? [])
						.map((c) =>
							renderBlock(c)
								.trimEnd()
								.split("\n")
								.map((line) => `> ${line}`)
								.join("\n"),
						)
						.join("\n") + "\n\n"
				);
			case "callout": {
				const emoji = String(n.attrs?.emoji ?? "💡");
				const inner = (n.content ?? []).map((c) => renderBlock(c).trimEnd()).join("\n");
				return `> ${emoji} ${inner}\n\n`;
			}
			case "codeBlock": {
				const lang = String(n.attrs?.language ?? "");
				const code = renderInline(n.content);
				return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
			}
			case "horizontalRule":
				return `---\n\n`;
			case "image": {
				const src = String(n.attrs?.src ?? "");
				const alt = String(n.attrs?.alt ?? "");
				return `![${alt}](${src})\n\n`;
			}
			case "table": {
				const rows = (n.content ?? []) as { content?: { content?: unknown[] }[] }[];
				if (rows.length === 0) return "";
				const lines: string[] = [];
				rows.forEach((row, rIdx) => {
					const cells = (row.content ?? []).map((cell) =>
						(cell.content ?? []).map((c) => renderBlock(c).trim()).join(" "),
					);
					lines.push(`| ${cells.join(" | ")} |`);
					if (rIdx === 0) {
						lines.push(`| ${cells.map(() => "---").join(" | ")} |`);
					}
				});
				return lines.join("\n") + "\n\n";
			}
			default:
				return (n.content ?? []).map((c) => renderBlock(c, indent)).join("");
		}
	};

	const body = (doc.content ?? []).map((b) => renderBlock(b)).join("");
	return `# ${title || "无标题文档"}\n\n${body.trim()}\n`;
}

function validateNode(node: unknown, path: string): string | null {
	if (!node || typeof node !== "object" || Array.isArray(node)) {
		return `${path} must be an object`;
	}
	const n = node as Record<string, unknown>;
	if (typeof n.type !== "string" || n.type.trim().length === 0) {
		return `${path}.type must be a non-empty string`;
	}
	if (n.text !== undefined && typeof n.text !== "string") {
		return `${path}.text must be a string`;
	}
	if (n.marks !== undefined) {
		if (!Array.isArray(n.marks)) return `${path}.marks must be an array`;
		for (let i = 0; i < n.marks.length; i++) {
			const m = n.marks[i] as Record<string, unknown> | null;
			if (!m || typeof m !== "object" || typeof m.type !== "string" || !m.type) {
				return `${path}.marks[${i}].type must be a non-empty string`;
			}
		}
	}
	if (n.content !== undefined) {
		if (!Array.isArray(n.content)) return `${path}.content must be an array`;
		for (let i = 0; i < n.content.length; i++) {
			const err = validateNode(n.content[i], `${path}.content[${i}]`);
			if (err) return err;
		}
	}
	return null;
}

export function validateTiptapJson(
	input: unknown,
): { ok: true; doc: TiptapDoc; serialized: string } | { ok: false; error: string } {
	let parsed: unknown = input;
	if (typeof input === "string") {
		try {
			parsed = JSON.parse(input);
		} catch (err) {
			return {
				ok: false,
				error: `Invalid JSON: ${err instanceof Error ? err.message : "parse error"}`,
			};
		}
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		return { ok: false, error: "Tiptap document must be a JSON object" };
	}
	const obj = parsed as Record<string, unknown>;
	if (obj.type !== "doc") {
		return { ok: false, error: 'Tiptap document root must have type "doc"' };
	}
	if (!Array.isArray(obj.content)) {
		return { ok: false, error: "Tiptap document must have a content array" };
	}
	for (let i = 0; i < obj.content.length; i++) {
		const err = validateNode(obj.content[i], `content[${i}]`);
		if (err) return { ok: false, error: err };
	}
	const doc = parsed as TiptapDoc;
	return { ok: true, doc, serialized: JSON.stringify(doc) };
}

function marksEqual(a?: TiptapMark[], b?: TiptapMark[]): boolean {
	if (!a?.length && !b?.length) return true;
	if ((a?.length ?? 0) !== (b?.length ?? 0)) return false;
	return JSON.stringify(a) === JSON.stringify(b);
}

function pushTextNode(out: TiptapNode[], text: string, marks: TiptapMark[]) {
	if (!text) return;
	const cleanMarks = marks.length > 0 ? marks.map((m) => ({ ...m })) : undefined;
	const prev = out[out.length - 1];
	if (prev && prev.type === "text" && marksEqual(prev.marks, cleanMarks)) {
		prev.text = (prev.text ?? "") + text;
		return;
	}
	const node: TiptapNode = { type: "text", text };
	if (cleanMarks) node.marks = cleanMarks;
	out.push(node);
}

function parseInline(input: string, activeMarks: TiptapMark[] = []): TiptapNode[] {
	const out: TiptapNode[] = [];
	let i = 0;

	const appendNodes = (nodes: TiptapNode[]) => {
		for (const n of nodes) {
			if (n.type === "text" && typeof n.text === "string") {
				pushTextNode(out, n.text, n.marks ?? []);
			} else {
				out.push(n);
			}
		}
	};

	while (i < input.length) {
		// Escaped char
		if (input[i] === "\\" && i + 1 < input.length) {
			if (input[i + 1] === "\n") {
				out.push({ type: "hardBreak" });
				i += 2;
				continue;
			}
			if (/[\\`*_{}[\]()#+\-.!~|<>]/.test(input[i + 1])) {
				pushTextNode(out, input[i + 1], activeMarks);
				i += 2;
				continue;
			}
		}

		// Hard break: two+ trailing spaces before \n, or <br> / <br/>
		if (input[i] === "\n") {
			out.push({ type: "hardBreak" });
			i += 1;
			continue;
		}
		const brMatch = input.slice(i).match(/^<br\s*\/?>/i);
		if (brMatch) {
			out.push({ type: "hardBreak" });
			i += brMatch[0].length;
			continue;
		}

		// Inline code `...`
		if (input[i] === "`") {
			const tickMatch = input.slice(i).match(/^(`+)/);
			if (tickMatch) {
				const ticks = tickMatch[1];
				const closeIdx = input.indexOf(ticks, i + ticks.length);
				if (closeIdx !== -1) {
					let codeText = input.slice(i + ticks.length, closeIdx);
					if (codeText.startsWith(" ") && codeText.endsWith(" ") && codeText.trim().length > 0) {
						codeText = codeText.slice(1, -1);
					}
					pushTextNode(out, codeText, [...activeMarks, { type: "code" }]);
					i = closeIdx + ticks.length;
					continue;
				}
			}
		}

		// Link [text](href)
		if (input[i] === "[") {
			const linkMatch = input.slice(i).match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/);
			if (linkMatch) {
				const [, label, href] = linkMatch;
				appendNodes(parseInline(label, [...activeMarks, { type: "link", attrs: { href } }]));
				i += linkMatch[0].length;
				continue;
			}
		}

		// Bold + Italic ***...*** or ___...___
		if (input.startsWith("***", i) || input.startsWith("___", i)) {
			const delim = input.slice(i, i + 3);
			const closeIdx = input.indexOf(delim, i + 3);
			if (closeIdx !== -1 && closeIdx > i + 3) {
				const inner = input.slice(i + 3, closeIdx);
				appendNodes(parseInline(inner, [...activeMarks, { type: "bold" }, { type: "italic" }]));
				i = closeIdx + 3;
				continue;
			}
		}

		// Bold **...** or __...__
		if (input.startsWith("**", i) || input.startsWith("__", i)) {
			const delim = input.slice(i, i + 2);
			const closeIdx = input.indexOf(delim, i + 2);
			if (closeIdx !== -1 && closeIdx > i + 2) {
				const inner = input.slice(i + 2, closeIdx);
				appendNodes(parseInline(inner, [...activeMarks, { type: "bold" }]));
				i = closeIdx + 2;
				continue;
			}
		}

		// Strikethrough ~~...~~
		if (input.startsWith("~~", i)) {
			const closeIdx = input.indexOf("~~", i + 2);
			if (closeIdx !== -1 && closeIdx > i + 2) {
				const inner = input.slice(i + 2, closeIdx);
				appendNodes(parseInline(inner, [...activeMarks, { type: "strike" }]));
				i = closeIdx + 2;
				continue;
			}
		}

		// Italic *...* or _..._
		if (input[i] === "*" || input[i] === "_") {
			const delim = input[i];
			const prevChar = i > 0 ? input[i - 1] : "";
			// Avoid treating snake_case underscores as italic
			if (delim === "_" && /[a-zA-Z0-9]/.test(prevChar)) {
				pushTextNode(out, input[i], activeMarks);
				i += 1;
				continue;
			}
			let closeIdx = i + 1;
			let found = -1;
			while (closeIdx < input.length) {
				if (input[closeIdx] === "\\" && closeIdx + 1 < input.length) {
					closeIdx += 2;
					continue;
				}
				if (input[closeIdx] === delim) {
					const nextChar = closeIdx + 1 < input.length ? input[closeIdx + 1] : "";
					if (delim === "_" && /[a-zA-Z0-9]/.test(nextChar)) {
						closeIdx += 1;
						continue;
					}
					found = closeIdx;
					break;
				}
				closeIdx += 1;
			}
			if (found !== -1 && found > i + 1) {
				const inner = input.slice(i + 1, found);
				if (!inner.startsWith(" ") && !inner.endsWith(" ")) {
					appendNodes(parseInline(inner, [...activeMarks, { type: "italic" }]));
					i = found + 1;
					continue;
				}
			}
		}

		pushTextNode(out, input[i], activeMarks);
		i += 1;
	}

	return out;
}

function makeParagraph(text: string): TiptapNode {
	const content = parseInline(text);
	return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
}

const CALLOUT_ALERT_EMOJIS: Record<string, { emoji: string; color: string }> = {
	NOTE: { emoji: "💡", color: "blue" },
	TIP: { emoji: "💡", color: "green" },
	IMPORTANT: { emoji: "📌", color: "purple" },
	WARNING: { emoji: "⚠️", color: "yellow" },
	CAUTION: { emoji: "❗", color: "red" },
};

function isTableSeparator(line: string): boolean {
	const trimmed = line.trim();
	if (!trimmed.includes("-")) return false;
	const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
	const cells = normalized.split("|");
	return cells.length > 0 && cells.every((c) => /^\s*:?-{3,}:?\s*$/.test(c));
}

function splitTableRow(line: string): string[] {
	const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
	return trimmed.split("|").map((c) => c.trim());
}

function parseListBlock(
	lines: string[],
	startIdx: number,
	baseIndent: number,
): { node: TiptapNode; nextIdx: number } {
	const firstLine = lines[startIdx];
	const isTask = /^\s*[-*+]\s+\[[ xX]\]\s+/.test(firstLine);
	const isOrdered = /^\s*\d+[.)]\s+/.test(firstLine);
	const listType = isTask ? "taskList" : isOrdered ? "orderedList" : "bulletList";
	const items: TiptapNode[] = [];
	let i = startIdx;

	while (i < lines.length) {
		const line = lines[i];
		if (!line.trim()) {
			// Look ahead to see if list continues at same/deeper indent
			if (i + 1 < lines.length && /^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i + 1])) {
				const nextIndent = lines[i + 1].match(/^(\s*)/)?.[1].length ?? 0;
				if (nextIndent >= baseIndent) {
					i += 1;
					continue;
				}
			}
			break;
		}

		const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
		if (indent < baseIndent) break;

		if (indent > baseIndent && items.length > 0) {
			if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
				const nested = parseListBlock(lines, i, indent);
				const lastItem = items[items.length - 1];
				lastItem.content = [...(lastItem.content ?? []), nested.node];
				i = nested.nextIdx;
				continue;
			}
			// Continuation text for previous item
			const lastItem = items[items.length - 1];
			const lastChild = lastItem.content?.[lastItem.content.length - 1];
			if (lastChild && lastChild.type === "paragraph") {
				const extra = parseInline(" " + line.trim());
				lastChild.content = [...(lastChild.content ?? []), ...extra];
			}
			i += 1;
			continue;
		}

		const taskMatch = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
		const orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
		const bulletMatch = line.match(/^\s*[-*+]\s+(.*)$/);

		if (listType === "taskList" && taskMatch) {
			items.push({
				type: "taskItem",
				attrs: { checked: taskMatch[1].toLowerCase() === "x" },
				content: [makeParagraph(taskMatch[2])],
			});
			i += 1;
		} else if (listType === "orderedList" && orderedMatch) {
			items.push({
				type: "listItem",
				content: [makeParagraph(orderedMatch[1])],
			});
			i += 1;
		} else if (listType === "bulletList" && bulletMatch && !taskMatch) {
			items.push({
				type: "listItem",
				content: [makeParagraph(bulletMatch[1])],
			});
			i += 1;
		} else {
			break;
		}
	}

	return {
		node: { type: listType, content: items },
		nextIdx: i,
	};
}

function parseBlocks(lines: string[]): TiptapNode[] {
	const nodes: TiptapNode[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed) {
			i += 1;
			continue;
		}

		// Fenced code block
		const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
		if (fenceMatch) {
			const fence = fenceMatch[1];
			const fenceChar = fence[0];
			const fenceLen = fence.length;
			const lang = fenceMatch[2].trim();
			const codeLines: string[] = [];
			i += 1;
			while (i < lines.length) {
				const closeRe = new RegExp(`^ {0,3}${fenceChar}{${fenceLen},}\\s*$`);
				if (closeRe.test(lines[i])) {
					i += 1;
					break;
				}
				codeLines.push(lines[i]);
				i += 1;
			}
			const code = codeLines.join("\n");
			nodes.push({
				type: "codeBlock",
				attrs: { language: lang || null },
				content: code ? [{ type: "text", text: code }] : [],
			});
			continue;
		}

		// Horizontal rule
		if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
			nodes.push({ type: "horizontalRule" });
			i += 1;
			continue;
		}

		// Heading
		const headingMatch = line.match(/^ {0,3}(#{1,6})\s+(.*)$/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const text = headingMatch[2].replace(/\s+#+\s*$/, "").trim();
			const content = parseInline(text);
			nodes.push({
				type: "heading",
				attrs: { level },
				...(content.length > 0 ? { content } : {}),
			});
			i += 1;
			continue;
		}

		// Standalone image
		const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
		if (imgMatch) {
			nodes.push({
				type: "image",
				attrs: {
					src: imgMatch[2],
					alt: imgMatch[1] || null,
					title: imgMatch[3] || null,
				},
			});
			i += 1;
			continue;
		}

		// GFM Table
		if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
			const headerCells = splitTableRow(line);
			const colCount = headerCells.length;
			const tableRows: TiptapNode[] = [
				{
					type: "tableRow",
					content: headerCells.map((cell) => ({
						type: "tableHeader",
						attrs: { colspan: 1, rowspan: 1, colwidth: null },
						content: [makeParagraph(cell)],
					})),
				},
			];
			i += 2;
			while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
				const rawCells = splitTableRow(lines[i]);
				const padded = Array.from({ length: colCount }, (_, idx) => rawCells[idx] ?? "");
				tableRows.push({
					type: "tableRow",
					content: padded.map((cell) => ({
						type: "tableCell",
						attrs: { colspan: 1, rowspan: 1, colwidth: null },
						content: [makeParagraph(cell)],
					})),
				});
				i += 1;
			}
			nodes.push({ type: "table", content: tableRows });
			continue;
		}

		// Blockquote / Callout
		if (/^ {0,3}>\s?/.test(line)) {
			const quoteLines: string[] = [];
			while (i < lines.length && /^ {0,3}>\s?/.test(lines[i])) {
				quoteLines.push(lines[i].replace(/^ {0,3}>\s?/, ""));
				i += 1;
			}
			const firstQuote = quoteLines[0]?.trim() ?? "";
			const alertMatch = firstQuote.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
			const emojiMatch = firstQuote.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s+(.*)$/u);

			if (alertMatch) {
				const meta = CALLOUT_ALERT_EMOJIS[alertMatch[1].toUpperCase()] ?? { emoji: "💡", color: "blue" };
				const restLines = [alertMatch[2], ...quoteLines.slice(1)].filter(Boolean);
				const inner = restLines.length > 0 ? parseBlocks(restLines) : [{ type: "paragraph" }];
				nodes.push({
					type: "callout",
					attrs: { emoji: meta.emoji, color: meta.color },
					content: inner,
				});
			} else if (emojiMatch) {
				const restLines = [emojiMatch[2], ...quoteLines.slice(1)];
				const inner = parseBlocks(restLines);
				nodes.push({
					type: "callout",
					attrs: { emoji: emojiMatch[1], color: "blue" },
					content: inner.length > 0 ? inner : [{ type: "paragraph" }],
				});
			} else {
				const inner = parseBlocks(quoteLines);
				nodes.push({
					type: "blockquote",
					content: inner.length > 0 ? inner : [{ type: "paragraph" }],
				});
			}
			continue;
		}

		// Lists (task / ordered / bullet)
		if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
			const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
			const listResult = parseListBlock(lines, i, indent);
			nodes.push(listResult.node);
			i = listResult.nextIdx;
			continue;
		}

		// Paragraph: collect until blank line or next block construct
		const paraLines: string[] = [];
		while (i < lines.length) {
			const cur = lines[i];
			if (!cur.trim()) break;
			if (
				paraLines.length > 0 &&
				(/^ {0,3}(#{1,6})\s+/.test(cur) ||
					/^ {0,3}(`{3,}|~{3,})/.test(cur) ||
					/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(cur) ||
					/^ {0,3}>\s?/.test(cur) ||
					/^\s*(?:[-*+]|\d+[.)])\s+/.test(cur))
			) {
				break;
			}
			paraLines.push(cur);
			i += 1;
		}

		// Join paragraph lines: trailing 2+ spaces or trailing backslash becomes hardBreak (\n)
		let joined = "";
		for (let idx = 0; idx < paraLines.length; idx++) {
			const pl = paraLines[idx];
			if (idx === paraLines.length - 1) {
				joined += pl;
			} else if (/ {2,}$/.test(pl)) {
				joined += pl.replace(/ {2,}$/, "") + "\n";
			} else if (/\\$/.test(pl)) {
				joined += pl.slice(0, -1) + "\n";
			} else {
				joined += pl + " ";
			}
		}
		nodes.push(makeParagraph(joined));
	}

	return nodes;
}

export function markdownToTiptapJson(markdown: string): TiptapDoc {
	const normalized = markdown.replace(/\r\n?/g, "\n");
	const lines = normalized.split("\n");
	const content = parseBlocks(lines);
	return {
		type: "doc",
		content: content.length > 0 ? content : [{ type: "paragraph" }],
	};
}

function isSingleEmptyParagraph(nodes: TiptapNode[]): boolean {
	if (nodes.length !== 1) return false;
	const first = nodes[0];
	return first.type === "paragraph" && (!first.content || first.content.length === 0);
}

export function appendTiptapNodes(existingContentJson: string, nodesToAppend: TiptapNode[]): TiptapDoc {
	let existingContent: TiptapNode[] = [];
	if (existingContentJson) {
		try {
			const parsed = JSON.parse(existingContentJson) as { type?: string; content?: TiptapNode[] };
			if (parsed && parsed.type === "doc" && Array.isArray(parsed.content)) {
				existingContent = parsed.content;
			}
		} catch {
			// Ignore malformed existing JSON and start fresh
		}
	}

	if (nodesToAppend.length === 0) {
		return {
			type: "doc",
			content: existingContent.length > 0 ? existingContent : [{ type: "paragraph" }],
		};
	}

	const base = isSingleEmptyParagraph(existingContent) ? [] : existingContent;
	return {
		type: "doc",
		content: [...base, ...nodesToAppend],
	};
}
