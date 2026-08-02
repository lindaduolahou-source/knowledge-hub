import { downloadBlob } from "./share-card";
import type { ShareCardDraft } from "./share-card-draft";
import {
  createVaultCard,
  emptyShareCardDraft,
  type VaultCard,
} from "./share-card-vault";
import { normalizeShareCardTypography } from "./share-card";

export const SHARE_CARD_TEMPLATE_KIND = "knowledge-hub-share-card-template";
export const SHARE_CARD_TEMPLATE_VERSION = 1;

export type ShareCardTemplate = {
  kind: typeof SHARE_CARD_TEMPLATE_KIND;
  version: number;
  name: string;
  description?: string;
  moduleId?: string;
  moduleIcon?: string;
  draft: ShareCardDraft;
};

export type BuiltinCardTemplate = {
  id: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  moduleIcon: string;
  draft: ShareCardDraft;
};

function draftWithTypography(
  patch: Partial<ShareCardDraft["typography"]>,
  title: string,
  body: string,
): ShareCardDraft {
  const base = emptyShareCardDraft();
  return {
    ...base,
    cardTitle: title,
    cardBody: body,
    typography: normalizeShareCardTypography({
      ...base.typography,
      ...patch,
    }),
  };
}

/** Built-in style templates (no heavy image assets). */
export const BUILTIN_CARD_TEMPLATES: BuiltinCardTemplate[] = [
  {
    id: "classic",
    nameZh: "经典深色",
    nameEn: "Classic dark",
    descriptionZh: "默认黑底白字，适合通用介绍",
    descriptionEn: "Default dark card for general intros",
    moduleIcon: "◇",
    draft: draftWithTypography(
      {},
      "Knowledge Hub",
      "记录学习 · 项目 · 思考",
    ),
  },
  {
    id: "serif",
    nameZh: "衬线阅读",
    nameEn: "Serif reading",
    descriptionZh: "宋体风格，偏笔记与文章分享",
    descriptionEn: "Serif look for notes and articles",
    moduleIcon: "✦",
    draft: draftWithTypography(
      {
        fontFamily: "noto-serif",
        titleSize: 52,
        bodySize: 26,
        titleColor: "#f4f1ea",
        bodyColor: "#d6d0c4",
      },
      "一篇值得分享的笔记",
      "把关键结论写在这里…",
    ),
  },
  {
    id: "mono",
    nameZh: "等宽实验室",
    nameEn: "Mono lab",
    descriptionZh: "等宽字体，偏项目与技术展示",
    descriptionEn: "Monospace style for projects and tech",
    moduleIcon: "⬡",
    draft: draftWithTypography(
      {
        fontFamily: "jetbrains-mono",
        titleSize: 44,
        bodySize: 22,
        titleColor: "#b7c4ce",
        bodyColor: "#9aa7b2",
      },
      "Project Lab",
      "stack · demo · notes",
    ),
  },
  {
    id: "soft",
    nameZh: "柔和圆润",
    nameEn: "Soft round",
    descriptionZh: "圆润无衬线，轻量友好",
    descriptionEn: "Rounded sans for a softer feel",
    moduleIcon: "◈",
    draft: draftWithTypography(
      {
        fontFamily: "quicksand",
        titleSize: 56,
        bodySize: 28,
        titleColor: "#ffffff",
        bodyColor: "#c9d2da",
      },
      "Hi, I'm building in public",
      "欢迎交流合作",
    ),
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeTemplateDraft(value: unknown): ShareCardDraft {
  const parsed = isRecord(value) ? value : {};
  const base = emptyShareCardDraft();
  return {
    cardTitle:
      typeof parsed.cardTitle === "string" ? parsed.cardTitle : base.cardTitle,
    cardBody:
      typeof parsed.cardBody === "string" ? parsed.cardBody : base.cardBody,
    backgroundUrl:
      typeof parsed.backgroundUrl === "string" ? parsed.backgroundUrl : null,
    stickers: Array.isArray(parsed.stickers) ? parsed.stickers : [],
    selected:
      parsed.selected && typeof parsed.selected === "object"
        ? (parsed.selected as Record<string, boolean>)
        : {},
    includeSelection: Boolean(parsed.includeSelection),
    selectionText:
      typeof parsed.selectionText === "string" ? parsed.selectionText : "",
    typography: normalizeShareCardTypography(
      parsed.typography as ShareCardDraft["typography"],
    ),
  };
}

/** Accept template JSON or a raw vault card export. */
export function parseShareCardTemplate(
  raw: unknown,
): ShareCardTemplate | null {
  if (!isRecord(raw)) return null;

  if (raw.kind === SHARE_CARD_TEMPLATE_KIND && isRecord(raw.draft)) {
    const name =
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim()
        : "Template";
    return {
      kind: SHARE_CARD_TEMPLATE_KIND,
      version:
        typeof raw.version === "number"
          ? raw.version
          : SHARE_CARD_TEMPLATE_VERSION,
      name,
      description:
        typeof raw.description === "string" ? raw.description : undefined,
      moduleId: typeof raw.moduleId === "string" ? raw.moduleId : undefined,
      moduleIcon:
        typeof raw.moduleIcon === "string" ? raw.moduleIcon : undefined,
      draft: normalizeTemplateDraft(raw.draft),
    };
  }

  // Vault card export: { id, name, moduleId, draft, ... }
  if (typeof raw.moduleId === "string" && isRecord(raw.draft)) {
    return {
      kind: SHARE_CARD_TEMPLATE_KIND,
      version: SHARE_CARD_TEMPLATE_VERSION,
      name:
        typeof raw.name === "string" && raw.name.trim()
          ? raw.name.trim()
          : "Imported card",
      moduleId: raw.moduleId,
      moduleIcon:
        typeof raw.moduleIcon === "string" ? raw.moduleIcon : undefined,
      draft: normalizeTemplateDraft(raw.draft),
    };
  }

  // Bare draft export
  if (
    typeof raw.cardTitle === "string" ||
    typeof raw.cardBody === "string" ||
    raw.typography
  ) {
    return {
      kind: SHARE_CARD_TEMPLATE_KIND,
      version: SHARE_CARD_TEMPLATE_VERSION,
      name: "Imported card",
      draft: normalizeTemplateDraft(raw),
    };
  }

  return null;
}

export function vaultCardToTemplate(card: VaultCard): ShareCardTemplate {
  return {
    kind: SHARE_CARD_TEMPLATE_KIND,
    version: SHARE_CARD_TEMPLATE_VERSION,
    name: card.name,
    moduleId: card.moduleId,
    moduleIcon: card.moduleIcon,
    draft: card.draft,
  };
}

export function downloadShareCardTemplate(card: VaultCard) {
  const template = vaultCardToTemplate(card);
  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: "application/json",
  });
  const slug = card.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  downloadBlob(blob, `card-template-${slug || card.id}.json`);
}

export async function readShareCardTemplateFile(
  file: File,
): Promise<ShareCardTemplate> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("invalid-json");
  }
  const template = parseShareCardTemplate(parsed);
  if (!template) throw new Error("invalid-template");
  return template;
}

export function importTemplateToVault(
  template: ShareCardTemplate,
  options?: { moduleId?: string; moduleIcon?: string },
): VaultCard {
  const moduleId = options?.moduleId || template.moduleId || "space";
  const moduleIcon =
    options?.moduleIcon || template.moduleIcon || "◇";
  return createVaultCard({
    moduleId,
    moduleIcon,
    name: template.name,
    draft: normalizeTemplateDraft(template.draft),
  });
}

export function builtinTemplateToShareCard(
  template: BuiltinCardTemplate,
): ShareCardTemplate {
  return {
    kind: SHARE_CARD_TEMPLATE_KIND,
    version: SHARE_CARD_TEMPLATE_VERSION,
    name: template.nameZh,
    description: template.descriptionZh,
    moduleIcon: template.moduleIcon,
    draft: template.draft,
  };
}
