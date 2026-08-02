import { downloadBlob } from "./share-card";
import type { MindMapDoc, MindMapNode } from "./mindmap-edits";

export const MINDMAP_TEMPLATE_KIND = "knowledge-hub-mindmap-template";
export const MINDMAP_TEMPLATE_VERSION = 1;

/** Nested outline used by free templates (ids assigned on apply). */
export type MindMapTemplateTree = {
  text: string;
  children?: MindMapTemplateTree[];
};

export type MindMapTemplate = {
  kind: typeof MINDMAP_TEMPLATE_KIND;
  version: number;
  name: string;
  description?: string;
  title: string;
  root: MindMapTemplateTree;
};

export type BuiltinMindMapTemplate = {
  id: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  titleZh: string;
  titleEn: string;
  rootZh: MindMapTemplateTree;
  rootEn: MindMapTemplateTree;
};

/** Free built-in templates (original outlines, free to use). */
export const BUILTIN_MINDMAP_TEMPLATES: BuiltinMindMapTemplate[] = [
  {
    id: "study-plan",
    nameZh: "学习计划",
    nameEn: "Study plan",
    descriptionZh: "目标 · 资源 · 练习 · 复盘",
    descriptionEn: "Goals · resources · practice · review",
    titleZh: "学习计划",
    titleEn: "Study plan",
    rootZh: {
      text: "学习主题",
      children: [
        {
          text: "目标",
          children: [{ text: "本周目标" }, { text: "本月目标" }],
        },
        {
          text: "资源",
          children: [{ text: "课程 / 书" }, { text: "笔记入口" }],
        },
        {
          text: "练习",
          children: [{ text: "小练习" }, { text: "项目练习" }],
        },
        {
          text: "复盘",
          children: [{ text: "做得好的" }, { text: "待改进" }],
        },
      ],
    },
    rootEn: {
      text: "Topic",
      children: [
        {
          text: "Goals",
          children: [{ text: "This week" }, { text: "This month" }],
        },
        {
          text: "Resources",
          children: [{ text: "Course / book" }, { text: "Notes" }],
        },
        {
          text: "Practice",
          children: [{ text: "Drills" }, { text: "Project" }],
        },
        {
          text: "Review",
          children: [{ text: "What worked" }, { text: "Improve" }],
        },
      ],
    },
  },
  {
    id: "project-breakdown",
    nameZh: "项目拆解",
    nameEn: "Project breakdown",
    descriptionZh: "范围 · 里程碑 · 风险 · 交付",
    descriptionEn: "Scope · milestones · risks · delivery",
    titleZh: "项目拆解",
    titleEn: "Project breakdown",
    rootZh: {
      text: "项目名称",
      children: [
        {
          text: "范围",
          children: [{ text: "必须做" }, { text: "可以不做" }],
        },
        {
          text: "里程碑",
          children: [{ text: "MVP" }, { text: "内测" }, { text: "发布" }],
        },
        {
          text: "风险",
          children: [{ text: "技术风险" }, { text: "时间风险" }],
        },
        {
          text: "交付",
          children: [{ text: "文档" }, { text: "演示" }],
        },
      ],
    },
    rootEn: {
      text: "Project",
      children: [
        {
          text: "Scope",
          children: [{ text: "Must have" }, { text: "Nice to have" }],
        },
        {
          text: "Milestones",
          children: [{ text: "MVP" }, { text: "Beta" }, { text: "Ship" }],
        },
        {
          text: "Risks",
          children: [{ text: "Tech" }, { text: "Schedule" }],
        },
        {
          text: "Deliverables",
          children: [{ text: "Docs" }, { text: "Demo" }],
        },
      ],
    },
  },
  {
    id: "reading-notes",
    nameZh: "读书笔记",
    nameEn: "Reading notes",
    descriptionZh: "论点 · 金句 · 疑问 · 行动",
    descriptionEn: "Thesis · quotes · questions · actions",
    titleZh: "读书笔记",
    titleEn: "Reading notes",
    rootZh: {
      text: "书名 / 文章",
      children: [
        { text: "核心论点", children: [{ text: "观点 1" }, { text: "观点 2" }] },
        { text: "金句", children: [{ text: "摘录…" }] },
        { text: "疑问", children: [{ text: "还想查什么" }] },
        { text: "行动", children: [{ text: "接下来做什么" }] },
      ],
    },
    rootEn: {
      text: "Book / article",
      children: [
        {
          text: "Thesis",
          children: [{ text: "Point 1" }, { text: "Point 2" }],
        },
        { text: "Quotes", children: [{ text: "Excerpt…" }] },
        { text: "Questions", children: [{ text: "Look up next" }] },
        { text: "Actions", children: [{ text: "Do next" }] },
      ],
    },
  },
  {
    id: "swot",
    nameZh: "SWOT 分析",
    nameEn: "SWOT analysis",
    descriptionZh: "优势 · 劣势 · 机会 · 威胁",
    descriptionEn: "Strengths · weaknesses · opportunities · threats",
    titleZh: "SWOT 分析",
    titleEn: "SWOT analysis",
    rootZh: {
      text: "分析对象",
      children: [
        { text: "优势 S", children: [{ text: "…" }] },
        { text: "劣势 W", children: [{ text: "…" }] },
        { text: "机会 O", children: [{ text: "…" }] },
        { text: "威胁 T", children: [{ text: "…" }] },
      ],
    },
    rootEn: {
      text: "Subject",
      children: [
        { text: "Strengths", children: [{ text: "…" }] },
        { text: "Weaknesses", children: [{ text: "…" }] },
        { text: "Opportunities", children: [{ text: "…" }] },
        { text: "Threats", children: [{ text: "…" }] },
      ],
    },
  },
  {
    id: "weekly-plan",
    nameZh: "周计划",
    nameEn: "Weekly plan",
    descriptionZh: "按星期安排重点事项",
    descriptionEn: "Key tasks by weekday",
    titleZh: "本周计划",
    titleEn: "This week",
    rootZh: {
      text: "本周重点",
      children: [
        { text: "周一", children: [{ text: "事项" }] },
        { text: "周二", children: [{ text: "事项" }] },
        { text: "周三", children: [{ text: "事项" }] },
        { text: "周四", children: [{ text: "事项" }] },
        { text: "周五", children: [{ text: "事项" }] },
        { text: "周末", children: [{ text: "休息 / 复盘" }] },
      ],
    },
    rootEn: {
      text: "Week focus",
      children: [
        { text: "Mon", children: [{ text: "Task" }] },
        { text: "Tue", children: [{ text: "Task" }] },
        { text: "Wed", children: [{ text: "Task" }] },
        { text: "Thu", children: [{ text: "Task" }] },
        { text: "Fri", children: [{ text: "Task" }] },
        { text: "Weekend", children: [{ text: "Rest / review" }] },
      ],
    },
  },
  {
    id: "knowledge-system",
    nameZh: "知识体系",
    nameEn: "Knowledge map",
    descriptionZh: "主题域拆成概念与实践",
    descriptionEn: "Domain → concepts → practice",
    titleZh: "知识体系",
    titleEn: "Knowledge map",
    rootZh: {
      text: "领域",
      children: [
        {
          text: "基础概念",
          children: [{ text: "概念 A" }, { text: "概念 B" }],
        },
        {
          text: "方法工具",
          children: [{ text: "工具 1" }, { text: "流程" }],
        },
        {
          text: "实践案例",
          children: [{ text: "案例…" }],
        },
        {
          text: "待学清单",
          children: [{ text: "下一主题" }],
        },
      ],
    },
    rootEn: {
      text: "Domain",
      children: [
        {
          text: "Basics",
          children: [{ text: "Concept A" }, { text: "Concept B" }],
        },
        {
          text: "Methods",
          children: [{ text: "Tool 1" }, { text: "Workflow" }],
        },
        {
          text: "Cases",
          children: [{ text: "Example…" }],
        },
        {
          text: "To learn",
          children: [{ text: "Next topic" }],
        },
      ],
    },
  },
];

export function expandTemplateTree(
  root: MindMapTemplateTree,
): MindMapNode[] {
  const nodes: MindMapNode[] = [];
  let seq = 0;
  function walk(tree: MindMapTemplateTree, parentId: string | null) {
    seq += 1;
    const id = `node-${Date.now().toString(36)}-${seq.toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    nodes.push({
      id,
      text: tree.text,
      parentId,
    });
    for (const child of tree.children ?? []) {
      walk(child, id);
    }
  }
  walk(root, null);
  return nodes;
}

export function builtinToMindMapTemplate(
  builtin: BuiltinMindMapTemplate,
  locale: "zh" | "en",
): MindMapTemplate {
  const zh = locale === "zh";
  return {
    kind: MINDMAP_TEMPLATE_KIND,
    version: MINDMAP_TEMPLATE_VERSION,
    name: zh ? builtin.nameZh : builtin.nameEn,
    description: zh ? builtin.descriptionZh : builtin.descriptionEn,
    title: zh ? builtin.titleZh : builtin.titleEn,
    root: zh ? builtin.rootZh : builtin.rootEn,
  };
}

export function docToMindMapTemplate(
  doc: MindMapDoc,
  meta?: { name?: string; description?: string },
): MindMapTemplate {
  const byParent = new Map<string | null, MindMapNode[]>();
  for (const node of doc.nodes) {
    const key = node.parentId;
    const list = byParent.get(key) ?? [];
    list.push(node);
    byParent.set(key, list);
  }

  function toTree(node: MindMapNode): MindMapTemplateTree {
    const children = byParent.get(node.id) ?? [];
    return {
      text: node.text,
      ...(children.length
        ? { children: children.map(toTree) }
        : {}),
    };
  }

  const root = doc.nodes.find((node) => node.parentId === null);
  return {
    kind: MINDMAP_TEMPLATE_KIND,
    version: MINDMAP_TEMPLATE_VERSION,
    name: meta?.name?.trim() || doc.title.trim() || "Mind map",
    description: meta?.description,
    title: doc.title,
    root: root
      ? toTree(root)
      : { text: doc.title || "Center", children: [] },
  };
}

function isTree(value: unknown): value is MindMapTemplateTree {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<MindMapTemplateTree>;
  if (typeof row.text !== "string") return false;
  if (row.children === undefined) return true;
  return Array.isArray(row.children) && row.children.every(isTree);
}

export function parseMindMapTemplate(value: unknown): MindMapTemplate | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.kind !== MINDMAP_TEMPLATE_KIND) return null;
  if (typeof row.name !== "string" || !row.name.trim()) return null;
  if (typeof row.title !== "string") return null;
  if (!isTree(row.root)) return null;
  return {
    kind: MINDMAP_TEMPLATE_KIND,
    version:
      typeof row.version === "number" ? row.version : MINDMAP_TEMPLATE_VERSION,
    name: row.name.trim(),
    description:
      typeof row.description === "string" ? row.description : undefined,
    title: row.title,
    root: row.root,
  };
}

export async function readMindMapTemplateFile(
  file: File,
): Promise<MindMapTemplate> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("invalid-json");
  }
  const template = parseMindMapTemplate(parsed);
  if (!template) throw new Error("invalid-template");
  return template;
}

/** Import a simple indented Markdown outline (`#` / `-` / spaces). */
export function parseMarkdownOutline(markdown: string): MindMapTemplate | null {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "  "))
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return null;

  type StackItem = { depth: number; node: MindMapTemplateTree };
  let root: MindMapTemplateTree | null = null;
  const stack: StackItem[] = [];

  for (const raw of lines) {
    const heading = raw.match(/^(#{1,6})\s+(.+)$/);
    const bullet = raw.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    let depth = 0;
    let text = "";
    if (heading) {
      depth = heading[1].length - 1;
      text = heading[2].trim();
    } else if (bullet) {
      depth = Math.floor(bullet[1].length / 2) + 1;
      text = bullet[3].trim();
    } else {
      text = raw.trim();
      depth = stack.length ? stack[stack.length - 1].depth + 1 : 0;
    }
    if (!text) continue;
    const node: MindMapTemplateTree = { text, children: [] };
    while (stack.length && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    if (!root || stack.length === 0) {
      root = node;
      stack.length = 0;
      stack.push({ depth, node });
      continue;
    }
    const parent = stack[stack.length - 1].node;
    parent.children = [...(parent.children ?? []), node];
    stack.push({ depth, node });
  }

  if (!root) return null;
  // Drop empty children arrays for cleanliness
  function clean(node: MindMapTemplateTree): MindMapTemplateTree {
    const children = (node.children ?? []).map(clean);
    return children.length ? { text: node.text, children } : { text: node.text };
  }
  const cleaned = clean(root);
  return {
    kind: MINDMAP_TEMPLATE_KIND,
    version: MINDMAP_TEMPLATE_VERSION,
    name: cleaned.text.slice(0, 40) || "Imported",
    title: cleaned.text.slice(0, 40) || "Imported",
    root: cleaned,
  };
}

export async function readMindMapImportFile(
  file: File,
): Promise<MindMapTemplate> {
  const name = file.name.toLowerCase();
  const text = await file.text();
  if (name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt")) {
    const outline = parseMarkdownOutline(text);
    if (!outline) throw new Error("invalid-markdown");
    return outline;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    const outline = parseMarkdownOutline(text);
    if (outline) return outline;
    throw new Error("invalid-json");
  }
  const template = parseMindMapTemplate(parsed);
  if (!template) throw new Error("invalid-template");
  return template;
}

export function exportMindMapTemplateFile(template: MindMapTemplate) {
  const blob = new Blob([`${JSON.stringify(template, null, 2)}\n`], {
    type: "application/json",
  });
  const safe = template.name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 48);
  downloadBlob(blob, `${safe || "mindmap-template"}.json`);
}
