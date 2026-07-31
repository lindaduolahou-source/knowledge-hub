import {
  DEFAULT_SHARE_CARD_FONT_ID,
  ensureShareCardFontLoaded,
  resolveShareCardFontStack,
  SHARE_CARD_FONT_OPTIONS,
  type ShareCardFontId,
} from "./share-card-fonts";

export type {
  ShareCardFontId,
  ShareCardFontOption,
} from "./share-card-fonts";
export {
  DEFAULT_SHARE_CARD_FONT_ID,
  ensureShareCardFontLoaded,
  getShareCardFontOption,
  resolveShareCardFontStack,
  SHARE_CARD_FONT_OPTIONS,
  shareCardFontLabel,
} from "./share-card-fonts";

export type ShareCardFieldDef = {
  /** Unique id within the dialog. */
  id: string;
  /** Optional localStorage content key; omit for title or selection-only. */
  contentKey?: string;
  label: string;
  defaultText: string;
  /** Always shown on the card when present. */
  role?: "title" | "body";
};

/** Sticker placement in normalized card coordinates (0–1). */
export type ShareCardSticker = {
  id: string;
  dataUrl: string;
  /** Center X as fraction of card width. */
  x: number;
  /** Center Y as fraction of card height. */
  y: number;
  /** Width as fraction of card width. */
  size: number;
  /** Rotation in degrees. */
  rotation: number;
};

export type ShareCardTypography = {
  fontFamily: ShareCardFontId;
  /** Title size in export pixels (≈28–80). */
  titleSize: number;
  /** Body size in export pixels (≈16–48). */
  bodySize: number;
  titleColor: string;
  bodyColor: string;
};

export const DEFAULT_SHARE_CARD_TYPOGRAPHY: ShareCardTypography = {
  fontFamily: DEFAULT_SHARE_CARD_FONT_ID,
  titleSize: 54,
  bodySize: 28,
  titleColor: "#ffffff",
  bodyColor: "#e8eaed",
};

export function normalizeShareCardTypography(
  value?: Partial<ShareCardTypography> | null,
): ShareCardTypography {
  const rawId = value?.fontFamily;
  const migrated =
    rawId === "noto"
      ? "noto-sans"
      : rawId === "serif"
        ? "noto-serif"
        : rawId === "mono"
          ? "jetbrains-mono"
          : rawId;
  const fontFamily = SHARE_CARD_FONT_OPTIONS.some(
    (item) => item.id === migrated,
  )
    ? (migrated as ShareCardFontId)
    : DEFAULT_SHARE_CARD_TYPOGRAPHY.fontFamily;

  return {
    fontFamily,
    titleSize: clampNumber(
      value?.titleSize ?? DEFAULT_SHARE_CARD_TYPOGRAPHY.titleSize,
      28,
      80,
    ),
    bodySize: clampNumber(
      value?.bodySize ?? DEFAULT_SHARE_CARD_TYPOGRAPHY.bodySize,
      16,
      48,
    ),
    titleColor:
      typeof value?.titleColor === "string" && value.titleColor.trim()
        ? value.titleColor
        : DEFAULT_SHARE_CARD_TYPOGRAPHY.titleColor,
    bodyColor:
      typeof value?.bodyColor === "string" && value.bodyColor.trim()
        ? value.bodyColor
        : DEFAULT_SHARE_CARD_TYPOGRAPHY.bodyColor,
  };
}

function clampNumber(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export type ShareCardPayload = {
  brand: string;
  moduleId: string;
  moduleIcon: string;
  title: string;
  lines: string[];
  footer?: string;
  backgroundDataUrl?: string | null;
  stickers?: ShareCardSticker[];
  typography?: Partial<ShareCardTypography> | null;
};

const CARD_W = 1200;
const CARD_H = 675;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  // Prefer wrapping by character for CJK / mixed scripts so long runs don't overflow.
  const chars = Array.from(normalized);
  const lines: string[] = [];
  let current = "";

  for (const ch of chars) {
    const next = current + ch;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = ch.trim() === "" ? "" : ch;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines) {
    const last = lines[maxLines - 1] ?? "";
    let truncated = last;
    while (
      truncated.length > 1 &&
      ctx.measureText(`${truncated}…`).width > maxWidth
    ) {
      truncated = truncated.slice(0, -1);
    }
    if (truncated !== last) lines[maxLines - 1] = `${truncated}…`;
  }

  return lines;
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  const step = 48;
  for (let x = 0; x <= CARD_W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CARD_H);
    ctx.stroke();
  }
  for (let y = 0; y <= CARD_H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CARD_W, y);
    ctx.stroke();
  }
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

export async function renderShareCardPng(
  payload: ShareCardPayload,
): Promise<Blob> {
  const typography = normalizeShareCardTypography(payload.typography);
  await ensureShareCardFontLoaded(typography.fontFamily);
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const hasCustomBg = Boolean(payload.backgroundDataUrl);
  const fontStack = resolveShareCardFontStack(typography.fontFamily);
  const titleSize = typography.titleSize;
  const bodySize = typography.bodySize;
  const titleLineHeight = Math.round(titleSize * 1.18);
  const bodyLineHeight = Math.round(bodySize * 1.45);

  // Background
  if (payload.backgroundDataUrl) {
    try {
      const bg = await loadImage(payload.backgroundDataUrl);
      drawImageCover(ctx, bg, CARD_W, CARD_H);
      // Dark veil so text stays readable on busy photos.
      ctx.fillStyle = "rgba(5,7,10,0.45)";
      ctx.fillRect(0, 0, CARD_W, CARD_H);
    } catch {
      ctx.fillStyle = "#05070a";
      ctx.fillRect(0, 0, CARD_W, CARD_H);
      drawGrid(ctx);
    }
  } else {
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    drawGrid(ctx);

    const vignette = ctx.createRadialGradient(
      CARD_W * 0.5,
      CARD_H * 0.35,
      40,
      CARD_W * 0.5,
      CARD_H * 0.4,
      CARD_W * 0.7,
    );
    vignette.addColorStop(0, "rgba(255,255,255,0.04)");
    vignette.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }

  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, CARD_W - 48, CARD_H - 48);

  const padX = 72;
  let y = 78;

  // Brand
  ctx.fillStyle = hasCustomBg
    ? "rgba(255,255,255,0.7)"
    : "rgba(255,255,255,0.45)";
  ctx.font = `300 22px ${fontStack}`;
  ctx.fillText("▸  Knowledge Hub", padX, y);
  y += 56;

  // Icon + title
  ctx.fillStyle = typography.titleColor;
  ctx.font = `300 ${Math.round(titleSize * 0.52)}px ${fontStack}`;
  if (payload.moduleIcon) {
    ctx.fillText(payload.moduleIcon, padX, y);
  }

  ctx.font = `400 ${titleSize}px ${fontStack}`;
  const titleX = payload.moduleIcon ? padX + 48 : padX;
  const titleLines = wrapText(
    ctx,
    payload.title || "Untitled",
    CARD_W - titleX - padX,
    2,
  );
  for (const line of titleLines) {
    ctx.fillText(line, titleX, y);
    y += titleLineHeight;
  }

  // Accent line
  y += 8;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(padX, y, 64, 2);
  y += 42;

  // Body lines
  ctx.fillStyle = typography.bodyColor;
  ctx.font = `400 ${bodySize}px ${fontStack}`;
  const bodyBudget = CARD_H - 120 - y;
  let remainingLines = Math.max(2, Math.floor(bodyBudget / bodyLineHeight));

  for (const raw of payload.lines) {
    if (remainingLines <= 0) break;
    const wrapped = wrapText(
      ctx,
      raw,
      CARD_W - padX * 2,
      remainingLines,
    );
    for (const line of wrapped) {
      ctx.fillText(line, padX, y);
      y += bodyLineHeight;
      remainingLines -= 1;
      if (remainingLines <= 0) break;
    }
    y += 10;
  }

  // Stickers (above text)
  for (const sticker of payload.stickers ?? []) {
    try {
      const img = await loadImage(sticker.dataUrl);
      const w = Math.max(24, sticker.size * CARD_W);
      const ratio =
        img.naturalHeight > 0 ? img.naturalHeight / img.naturalWidth : 1;
      const h = w * ratio;
      const cx = sticker.x * CARD_W;
      const cy = sticker.y * CARD_H;
      const radians = ((sticker.rotation ?? 0) * Math.PI) / 180;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(radians);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    } catch {
      // skip broken sticker
    }
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `300 18px ${fontStack}`;
  const footer =
    payload.footer?.trim() ||
    `${payload.moduleId}  ·  Knowledge Hub`;
  ctx.fillText(footer, padX, CARD_H - 56);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode PNG"));
      },
      "image/png",
      1,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Delay revoke so the browser can start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      return false;
    }
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Invalid image data"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}
