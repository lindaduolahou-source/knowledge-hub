import type { Locale } from "@/i18n/config";

/** Exact-phrase bilingual map for personal TOC notes (both directions). */
const PHRASE_MAP: Record<string, string> = {
  // User custom notes
  "关于我的故事": "About my story",
  "我是如何学习AI的": "How I learn AI",
  "我的笔记、我的读后感、我的知识库":
    "My notes, reading reflections, and knowledge base",
  "我的作品集": "My portfolio",
  "我的想法": "My thoughts",
  "我的联系方式": "My contact info",

  // Dictionary defaults (zh → en)
  "个人简介、技能栈与成长记录": "Profile, skills, and growth records",
  "系统化的学习路径，从基础到前沿":
    "A structured path from fundamentals to the frontier",
  "技术笔记、论文阅读与深度文章":
    "Technical notes, paper reviews, and deep dives",
  "实验项目、开源作品与工程实践":
    "Experiments, open source, and engineering practice",
  "关于学习、创作与成长的随想":
    "Reflections on learning, creating, and growth",
  "交流合作、问题反馈与社交链接":
    "Collaboration, feedback, and social links",

  // Module page defaults
  "一名持续学习者与 builder，热衷于知识管理、写作与构建。在这里记录轨迹，也分享给同路人。":
    "A continuous learner and builder, passionate about knowledge management, writing, and building. Documenting the journey here, and sharing it with fellow travelers.",
  "知识管理与写作": "Knowledge Management & Writing",
  "全栈开发": "Full-stack Development",
  "持续学习与分享": "Continuous Learning & Sharing",
  "如有合作意向或问题反馈，欢迎通过以下方式联系。":
    "For collaboration or feedback, feel free to reach out through the channels below.",

  // Module titles
  "我的空间": "My Space",
  "AI 学习路线": "AI Learning Path",
  "知识星球": "Knowledge Planet",
  "项目实验室": "Project Lab",
  "思考与灵感": "Thoughts & Inspiration",
  "联系方式": "Contact",
};

const REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PHRASE_MAP).map(([zh, en]) => [en, zh]),
);

function lookupPhrase(text: string, from: Locale, to: Locale): string | null {
  if (from === to) return text;
  if (from === "zh" && to === "en") return PHRASE_MAP[text] ?? null;
  if (from === "en" && to === "zh") return REVERSE_MAP[text] ?? null;
  return null;
}

async function translateViaApi(
  text: string,
  from: Locale,
  to: Locale,
): Promise<string | null> {
  try {
    const langpair = `${from}|${to}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    if (data.responseStatus !== 200) return null;
    const translated = data.responseData?.translatedText?.trim();
    if (!translated || translated.toUpperCase() === "NO QUERY SPECIFIED!") {
      return null;
    }
    return translated;
  } catch {
    return null;
  }
}

/**
 * Translate personal text between zh and en.
 * Prefer exact phrase map; fall back to free translation API; last resort keep original.
 * Multiline values are translated line-by-line (for focus lists, etc.).
 */
export async function translateTocNote(
  text: string,
  from: Locale,
  to: Locale,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || from === to) return trimmed;

  if (trimmed.includes("\n")) {
    const lines = trimmed.split(/\r?\n/);
    const translated = await Promise.all(
      lines.map(async (line) => {
        const part = line.trim();
        if (!part) return "";
        return translateSingleLine(part, from, to);
      }),
    );
    return translated.join("\n");
  }

  return translateSingleLine(trimmed, from, to);
}

async function translateSingleLine(
  text: string,
  from: Locale,
  to: Locale,
): Promise<string> {
  const mapped = lookupPhrase(text, from, to);
  if (mapped !== null) return mapped;

  const remote = await translateViaApi(text, from, to);
  if (remote) return remote;

  return text;
}

/** Register a user phrase so later sync stays consistent without re-calling the API. */
export function rememberTocPhrase(fromText: string, toText: string, from: Locale) {
  const a = fromText.trim();
  const b = toText.trim();
  if (!a || !b || a === b) return;
  if (from === "zh") {
    PHRASE_MAP[a] = b;
    REVERSE_MAP[b] = a;
  } else {
    REVERSE_MAP[a] = b;
    PHRASE_MAP[b] = a;
  }
}
