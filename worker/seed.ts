export async function seedInitialDocsIfEmpty(db: D1Database): Promise<void> {
	const countRow = await db
		.prepare("SELECT COUNT(*) as total FROM docs")
		.first<{ total: number }>();
	if ((countRow?.total ?? 0) > 0) return;

	const now = new Date().toISOString();
	const welcomeId = "welcome-lark-docs";
	const guideId = "quick-start-guide";
	const blocksId = "block-editor-showcase";
	const notesId = "weekly-notes-template";

	const welcomeContent = JSON.stringify({
		type: "doc",
		content: [
			{
				type: "callout",
				attrs: { emoji: "👋", color: "blue" },
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								marks: [{ type: "bold" }],
								text: "欢迎来到 Lark Docs！",
							},
							{
								type: "text",
								text: " 这是一个部署在 Cloudflare Workers + D1 上的个人云端文档空间，受 Cloudflare Access 零信任鉴权保护。",
							},
						],
					},
				],
			},
			{
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: "✨ 核心特性一览" }],
			},
			{
				type: "bulletList",
				content: [
					{
						type: "listItem",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", marks: [{ type: "bold" }], text: "无限层级文档树：" },
									{ type: "text", text: "左侧导航栏支持多级目录折叠、悬浮新建子文档、收藏夹、最近编辑与回收站恢复。" },
								],
							},
						],
					},
					{
						type: "listItem",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", marks: [{ type: "bold" }], text: "块级富文本编辑：" },
									{ type: "text", text: "输入 " },
									{ type: "text", marks: [{ type: "code" }], text: "/" },
									{ type: "text", text: " 唤起斜杠命令菜单，支持标题、待办清单、高亮块、表格、代码块、图片等。" },
								],
							},
						],
					},
					{
						type: "listItem",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", marks: [{ type: "bold" }], text: "全局搜索 & 极简大纲：" },
									{ type: "text", text: "按 " },
									{ type: "text", marks: [{ type: "code" }], text: "Cmd/Ctrl + K" },
									{ type: "text", text: " 秒搜全库文档；右侧悬浮线条大纲自动提取章节并支持平滑跳转。" },
								],
							},
						],
					},
					{
						type: "listItem",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", marks: [{ type: "bold" }], text: "云端实时同步：" },
									{ type: "text", text: "所有编辑内容自动防抖保存至 Cloudflare D1 数据库，支持导出 Markdown 与 HTML。" },
								],
							},
						],
					},
				],
			},
			{
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: "🚀 试试这些快捷键" }],
			},
			{
				type: "taskList",
				content: [
					{
						type: "taskItem",
						attrs: { checked: true },
						content: [{ type: "paragraph", content: [{ type: "text", text: "输入 / 打开斜杠命令面板" }] }],
					},
					{
						type: "taskItem",
						attrs: { checked: false },
						content: [{ type: "paragraph", content: [{ type: "text", text: "选中任意文字体验悬浮格式工具栏（加粗、高亮、超链接、对齐）" }] }],
					},
					{
						type: "taskItem",
						attrs: { checked: false },
						content: [{ type: "paragraph", content: [{ type: "text", text: "将鼠标移至段落左侧，点击 + 或拖拽手柄移动/删除块" }] }],
					},
					{
						type: "taskItem",
						attrs: { checked: false },
						content: [{ type: "paragraph", content: [{ type: "text", text: "按 Cmd/Ctrl + K 打开全局文档搜索" }] }],
					},
				],
			},
			{
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: "💻 代码块示例" }],
			},
			{
				type: "codeBlock",
				attrs: { language: "typescript" },
				content: [
					{
						type: "text",
						text: "// Cloudflare Worker + D1 实时保存\nexport async function saveDocument(id: string, content: string) {\n  await fetch(`/api/docs/${id}`, {\n    method: 'PATCH',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ content }),\n  });\n}",
					},
				],
			},
		],
	});

	const guideContent = JSON.stringify({
		type: "doc",
		content: [
			{
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: "1. 组织你的知识库" }],
			},
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						text: "在左侧目录树中，将鼠标悬停在任意文档上，点击 + 即可创建子文档。你可以无限嵌套层级，将常用文档点击星标加入「收藏夹」。",
					},
				],
			},
			{
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: "2. Markdown 快捷输入" }],
			},
			{
				type: "paragraph",
				content: [
					{ type: "text", text: "在空行直接输入以下符号并敲击空格，即可快速转换块类型：" },
				],
			},
			{
				type: "table",
				content: [
					{
						type: "tableRow",
						content: [
							{ type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "输入语法" }] }] },
							{ type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "转换效果" }] }] },
						],
					},
					{
						type: "tableRow",
						content: [
							{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "code" }], text: "# + 空格" }] }] },
							{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "一级标题（支持 # 到 ####）" }] }] },
						],
					},
					{
						type: "tableRow",
						content: [
							{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "code" }], text: "- + 空格" }] }] },
							{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "无序列表" }] }] },
						],
					},
					{
						type: "tableRow",
						content: [
							{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "code" }], text: "[] + 空格" }] }] },
							{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "待办清单" }] }] },
						],
					},
					{
						type: "tableRow",
						content: [
							{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "code" }], text: "> + 空格" }] }] },
							{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "引用块" }] }] },
						],
					},
					{
						type: "tableRow",
						content: [
							{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "code" }], text: "---" }] }] },
							{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "分割线" }] }] },
						],
					},
				],
			},
		],
	});

	const blocksContent = JSON.stringify({
		type: "doc",
		content: [
			{
				type: "callout",
				attrs: { emoji: "💡", color: "yellow" },
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "提示：点击高亮块左上角的 Emoji 可以切换图标，右上角可以切换 5 种主题配色。" }],
					},
				],
			},
			{
				type: "callout",
				attrs: { emoji: "✅", color: "green" },
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "绿色高亮块适合用于记录完成事项、最佳实践或成功经验。" }],
					},
				],
			},
			{
				type: "blockquote",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "好的文档工具应当像纸张一样安静，只在需要时提供恰到好处的排版能力。" }],
					},
				],
			},
		],
	});

	const notesContent = JSON.stringify({
		type: "doc",
		content: [
			{
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: "🎯 本周重点目标" }],
			},
			{
				type: "taskList",
				content: [
					{
						type: "taskItem",
						attrs: { checked: true },
						content: [{ type: "paragraph", content: [{ type: "text", text: "完成 Lark Docs 个人文档站部署" }] }],
					},
					{
						type: "taskItem",
						attrs: { checked: false },
						content: [{ type: "paragraph", content: [{ type: "text", text: "整理个人技术笔记与常用命令" }] }],
					},
				],
			},
			{
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: "📝 随手记录" }],
			},
			{
				type: "paragraph",
				content: [{ type: "text", text: "在这里开始写下你的想法..." }],
			},
		],
	});

	const stmts = [
		db
			.prepare(
				`INSERT INTO docs (id, parent_id, title, emoji, cover, content, is_favorite, is_deleted, sort_order, word_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
			)
			.bind(
				welcomeId,
				null,
				"欢迎使用 Lark Docs",
				"📘",
				"linear-gradient(135deg, #3370FF 0%, #6B9BFF 50%, #A5C4FF 100%)",
				welcomeContent,
				1,
				0,
				260,
				now,
				now,
			),
		db
			.prepare(
				`INSERT INTO docs (id, parent_id, title, emoji, cover, content, is_favorite, is_deleted, sort_order, word_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
			)
			.bind(
				guideId,
				welcomeId,
				"快速上手指南",
				"🧭",
				null,
				guideContent,
				0,
				1,
				140,
				now,
				now,
			),
		db
			.prepare(
				`INSERT INTO docs (id, parent_id, title, emoji, cover, content, is_favorite, is_deleted, sort_order, word_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
			)
			.bind(
				blocksId,
				welcomeId,
				"块级编辑与高亮块示例",
				"🎨",
				"linear-gradient(135deg, #00B578 0%, #52D1A2 100%)",
				blocksContent,
				0,
				2,
				85,
				now,
				now,
			),
		db
			.prepare(
				`INSERT INTO docs (id, parent_id, title, emoji, cover, content, is_favorite, is_deleted, sort_order, word_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
			)
			.bind(
				notesId,
				null,
				"周报与待办模板",
				"📋",
				null,
				notesContent,
				0,
				3,
				60,
				now,
				now,
			),
	];

	await db.batch(stmts);
}
