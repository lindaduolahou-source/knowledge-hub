import { downloadBlob } from "./share-card";
import {
  ensureShareCardFontLoaded,
  getShareCardFontOption,
  SHARE_CARD_FONT_OPTIONS,
  type ShareCardFontId,
} from "./share-card-fonts";

/** Default node fill — white for a calm, uniform look. */
export const DEFAULT_MINDMAP_NODE_BG = "#ffffff";

/** Neutral fill presets for mind-map nodes (no rainbow palette). */
export const MINDMAP_NODE_COLORS = [
  { id: "white", hex: "#ffffff", labelZh: "白色", labelEn: "White" },
  { id: "snow", hex: "#f5f5f5", labelZh: "浅灰白", labelEn: "Snow" },
  { id: "mist", hex: "#e8eaed", labelZh: "雾灰", labelEn: "Mist" },
  { id: "silver", hex: "#cfd4da", labelZh: "银灰", labelEn: "Silver" },
  { id: "slate", hex: "#8a9ba8", labelZh: "青灰", labelEn: "Slate" },
  { id: "ink", hex: "#2a323c", labelZh: "墨色", labelEn: "Ink" },
] as const;

/** Fonts offered in the mind-map editor (subset of share-card fonts). */
export const MINDMAP_FONT_IDS = [
  "system-sans",
  "quicksand",
  "noto-sans",
  "noto-serif",
  "jetbrains-mono",
  "zcool-xiaowei",
  "ma-shan-zheng",
  "space-grotesk",
] as const;

export type MindMapFontId = (typeof MINDMAP_FONT_IDS)[number];

export function isMindMapFontId(value: string): value is MindMapFontId {
  return (MINDMAP_FONT_IDS as readonly string[]).includes(value);
}

export function mindMapFontOptions() {
  return MINDMAP_FONT_IDS.map((id) => getShareCardFontOption(id)).filter(
    (option) => SHARE_CARD_FONT_OPTIONS.some((row) => row.id === option.id),
  );
}

export function resolveMindMapFontStack(fontId?: string): string {
  if (!fontId || !isMindMapFontId(fontId)) {
    return 'system-ui, "Noto Sans SC", sans-serif';
  }
  return getShareCardFontOption(fontId).stack;
}

export async function ensureMindMapFontLoaded(fontId?: string) {
  if (!fontId || !isMindMapFontId(fontId)) return;
  await ensureShareCardFontLoaded(fontId as ShareCardFontId);
}

/** Pick readable text color for a given background hex. */
export function contrastTextColor(bgHex: string): string {
  const hex = bgHex.replace("#", "").trim();
  if (hex.length !== 6) return "rgba(255,255,255,0.9)";
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return "rgba(255,255,255,0.9)";
  }
  // Relative luminance (sRGB approx)
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma > 0.55 ? "rgba(12,14,18,0.92)" : "rgba(255,255,255,0.92)";
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

/** Free built-in connector / edge style templates. */
export type MindMapEdgePath = "curve" | "straight" | "elbow";

export type MindMapEdgeStyle = {
  id: string;
  path: MindMapEdgePath;
  width: number;
  color: string;
  dasharray?: string;
  arrow?: boolean;
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
};

export const DEFAULT_MINDMAP_EDGE_STYLE_ID = "curve-soft";

/** Free connector template library (original presets, free to use). */
export const MINDMAP_EDGE_STYLE_TEMPLATES: MindMapEdgeStyle[] = [
  {
    id: "curve-soft",
    path: "curve",
    width: 1.5,
    color: "rgba(255,255,255,0.22)",
    labelZh: "柔和曲线",
    labelEn: "Soft curve",
    descriptionZh: "默认贝塞尔连线",
    descriptionEn: "Default bezier links",
  },
  {
    id: "curve-bold",
    path: "curve",
    width: 2.5,
    color: "rgba(125,211,192,0.55)",
    labelZh: "粗曲线",
    labelEn: "Bold curve",
    descriptionZh: "更醒目的弧线",
    descriptionEn: "Thicker curved links",
  },
  {
    id: "curve-dash",
    path: "curve",
    width: 1.5,
    color: "rgba(255,255,255,0.35)",
    dasharray: "6 4",
    labelZh: "虚线曲线",
    labelEn: "Dashed curve",
    descriptionZh: "适合弱关联",
    descriptionEn: "For looser relationships",
  },
  {
    id: "straight",
    path: "straight",
    width: 1.5,
    color: "rgba(255,255,255,0.28)",
    labelZh: "直线",
    labelEn: "Straight",
    descriptionZh: "简洁直线连接",
    descriptionEn: "Clean straight links",
  },
  {
    id: "straight-arrow",
    path: "straight",
    width: 1.75,
    color: "rgba(126,182,214,0.65)",
    arrow: true,
    labelZh: "箭头直线",
    labelEn: "Arrow line",
    descriptionZh: "带箭头的方向感",
    descriptionEn: "Directional arrows",
  },
  {
    id: "elbow",
    path: "elbow",
    width: 1.5,
    color: "rgba(255,255,255,0.28)",
    labelZh: "折线",
    labelEn: "Elbow",
    descriptionZh: "直角折线，偏结构图",
    descriptionEn: "Right-angle routing",
  },
  {
    id: "elbow-dash",
    path: "elbow",
    width: 1.5,
    color: "rgba(184,164,217,0.55)",
    dasharray: "4 3",
    labelZh: "虚线折线",
    labelEn: "Dashed elbow",
    descriptionZh: "折线 + 虚线",
    descriptionEn: "Elbow with dashes",
  },
  {
    id: "flow-dot",
    path: "curve",
    width: 2,
    color: "rgba(224,122,106,0.55)",
    dasharray: "1.5 5",
    arrow: true,
    labelZh: "点状流向",
    labelEn: "Dotted flow",
    descriptionZh: "点线 + 箭头",
    descriptionEn: "Dotted with arrow",
  },
];

export function getMindMapEdgeStyle(id?: string | null): MindMapEdgeStyle {
  return (
    MINDMAP_EDGE_STYLE_TEMPLATES.find((item) => item.id === id) ??
    MINDMAP_EDGE_STYLE_TEMPLATES[0]
  );
}

export function isMindMapEdgeStyleId(value: string): boolean {
  return MINDMAP_EDGE_STYLE_TEMPLATES.some((item) => item.id === value);
}

/** Serializable connector style (imported / custom). */
export type MindMapEdgeStylePayload = {
  path: MindMapEdgePath;
  width: number;
  color: string;
  dasharray?: string;
  arrow?: boolean;
  name?: string;
  /** Id in personal style library when applied from there. */
  libraryId?: string;
};

export const MINDMAP_STYLE_KIND = "knowledge-hub-mindmap-style";
export const MINDMAP_STYLE_VERSION = 1;

export type MindMapStylePack = {
  kind: typeof MINDMAP_STYLE_KIND;
  version: number;
  name: string;
  description?: string;
  edge: MindMapEdgeStylePayload;
};

const EDGE_PATHS: MindMapEdgePath[] = ["curve", "straight", "elbow"];

function isEdgePath(value: unknown): value is MindMapEdgePath {
  return typeof value === "string" && EDGE_PATHS.includes(value as MindMapEdgePath);
}

function isCssColor(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (isHexColor(v)) return true;
  if (/^rgba?\(/i.test(v)) return true;
  if (/^hsla?\(/i.test(v)) return true;
  return /^[a-zA-Z]+$/.test(v);
}

export function parseMindMapEdgePayload(
  value: unknown,
): MindMapEdgeStylePayload | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isEdgePath(row.path)) return null;
  if (typeof row.width !== "number" || !Number.isFinite(row.width)) return null;
  const width = Math.min(8, Math.max(0.5, row.width));
  if (typeof row.color !== "string" || !isCssColor(row.color)) return null;
  const payload: MindMapEdgeStylePayload = {
    path: row.path,
    width,
    color: row.color.trim(),
  };
  if (typeof row.dasharray === "string" && row.dasharray.trim()) {
    payload.dasharray = row.dasharray.trim();
  }
  if (row.arrow === true) payload.arrow = true;
  if (typeof row.name === "string" && row.name.trim()) {
    payload.name = row.name.trim();
  }
  if (typeof row.libraryId === "string" && row.libraryId.trim()) {
    payload.libraryId = row.libraryId.trim();
  }
  return payload;
}

export function normalizeCustomEdgeStyle(
  value: unknown,
): MindMapEdgeStylePayload | null {
  return parseMindMapEdgePayload(value);
}

export function parseMindMapStylePack(value: unknown): MindMapStylePack | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.kind !== MINDMAP_STYLE_KIND) return null;
  if (typeof row.name !== "string" || !row.name.trim()) return null;

  let edge = parseMindMapEdgePayload(row.edge);
  if (!edge && typeof row.edgeStyleId === "string") {
    const builtin = MINDMAP_EDGE_STYLE_TEMPLATES.find(
      (item) => item.id === row.edgeStyleId,
    );
    if (builtin) {
      edge = {
        path: builtin.path,
        width: builtin.width,
        color: builtin.color,
        ...(builtin.dasharray ? { dasharray: builtin.dasharray } : {}),
        ...(builtin.arrow ? { arrow: true } : {}),
        name: builtin.labelEn,
      };
    }
  }
  if (!edge) return null;

  return {
    kind: MINDMAP_STYLE_KIND,
    version:
      typeof row.version === "number" ? row.version : MINDMAP_STYLE_VERSION,
    name: row.name.trim(),
    description:
      typeof row.description === "string" ? row.description : undefined,
    edge: {
      ...edge,
      name: edge.name || row.name.trim(),
    },
  };
}

export function edgeStyleToPayload(
  style: MindMapEdgeStyle,
): MindMapEdgeStylePayload {
  return {
    path: style.path,
    width: style.width,
    color: style.color,
    ...(style.dasharray ? { dasharray: style.dasharray } : {}),
    ...(style.arrow ? { arrow: true } : {}),
    name: style.labelEn,
  };
}

export function payloadToEdgeStyle(
  payload: MindMapEdgeStylePayload,
): MindMapEdgeStyle {
  const name = payload.name?.trim() || "Custom";
  return {
    id: payload.libraryId ? `imported:${payload.libraryId}` : "custom",
    path: payload.path,
    width: payload.width,
    color: payload.color,
    ...(payload.dasharray ? { dasharray: payload.dasharray } : {}),
    ...(payload.arrow ? { arrow: true } : {}),
    labelZh: name,
    labelEn: name,
    descriptionZh: "导入样式",
    descriptionEn: "Imported style",
  };
}

/** Resolve connector style for a mind-map document. */
export function resolveDocEdgeStyle(doc: {
  edgeStyleId?: string | null;
  customEdgeStyle?: MindMapEdgeStylePayload | null;
}): MindMapEdgeStyle {
  if (doc.customEdgeStyle) return payloadToEdgeStyle(doc.customEdgeStyle);
  return getMindMapEdgeStyle(doc.edgeStyleId);
}

export function stylePackFromEdge(
  edge: MindMapEdgeStylePayload,
  meta?: { name?: string; description?: string },
): MindMapStylePack {
  const name = meta?.name?.trim() || edge.name?.trim() || "Mind map style";
  return {
    kind: MINDMAP_STYLE_KIND,
    version: MINDMAP_STYLE_VERSION,
    name,
    description: meta?.description,
    edge: { ...edge, name: edge.name || name },
  };
}

export async function readMindMapStylePackFile(
  file: File,
): Promise<MindMapStylePack> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("invalid-json");
  }
  const pack = parseMindMapStylePack(parsed);
  if (pack) return pack;

  // Allow bare edge payload or builtin id string wrapper.
  const bare = parseMindMapEdgePayload(parsed);
  if (bare) {
    return stylePackFromEdge(bare);
  }
  if (parsed && typeof parsed === "object") {
    const row = parsed as Record<string, unknown>;
    if (typeof row.edgeStyleId === "string") {
      const fromId = parseMindMapStylePack({
        kind: MINDMAP_STYLE_KIND,
        version: MINDMAP_STYLE_VERSION,
        name: row.edgeStyleId,
        edgeStyleId: row.edgeStyleId,
      });
      if (fromId) return fromId;
    }
  }
  throw new Error("invalid-style");
}

export function exportMindMapStylePackFile(pack: MindMapStylePack) {
  const blob = new Blob([`${JSON.stringify(pack, null, 2)}\n`], {
    type: "application/json",
  });
  const safe = pack.name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 48);
  downloadBlob(blob, `${safe || "mindmap-style"}.json`);
}

/** Build SVG path `d` for a connector. */
export function mindMapEdgePathD(
  path: MindMapEdgePath,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  if (path === "straight") {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  if (path === "elbow") {
    const mid = (x1 + x2) / 2;
    return `M ${x1} ${y1} L ${mid} ${y1} L ${mid} ${y2} L ${x2} ${y2}`;
  }
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}
