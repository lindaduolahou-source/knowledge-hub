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

export type ShareCardPayload = {
  brand: string;
  moduleId: string;
  moduleIcon: string;
  title: string;
  lines: string[];
  footer?: string;
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

export async function renderShareCardPng(
  payload: ShareCardPayload,
): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Background
  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  drawGrid(ctx);

  // Soft vignette
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

  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, CARD_W - 48, CARD_H - 48);

  const padX = 72;
  let y = 78;

  // Brand
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = '300 22px Quicksand, "Noto Sans SC", sans-serif';
  ctx.fillText("▸  Knowledge Hub", padX, y);
  y += 56;

  // Icon + title
  ctx.fillStyle = "#ffffff";
  ctx.font = '300 28px Quicksand, "Noto Sans SC", sans-serif';
  if (payload.moduleIcon) {
    ctx.fillText(payload.moduleIcon, padX, y);
  }

  ctx.font = '400 54px Quicksand, "Noto Sans SC", sans-serif';
  const titleX = payload.moduleIcon ? padX + 48 : padX;
  const titleLines = wrapText(
    ctx,
    payload.title || "Untitled",
    CARD_W - titleX - padX,
    2,
  );
  for (const line of titleLines) {
    ctx.fillText(line, titleX, y);
    y += 64;
  }

  // Accent line
  y += 8;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(padX, y, 64, 2);
  y += 42;

  // Body lines
  ctx.fillStyle = "rgba(232,234,237,0.78)";
  ctx.font = '400 28px Quicksand, "Noto Sans SC", sans-serif';
  const bodyBudget = CARD_H - 120 - y;
  const lineHeight = 42;
  let remainingLines = Math.max(2, Math.floor(bodyBudget / lineHeight));

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
      y += lineHeight;
      remainingLines -= 1;
      if (remainingLines <= 0) break;
    }
    y += 10;
    remainingLines -= 0;
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = '300 18px Quicksand, "Noto Sans SC", sans-serif';
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
