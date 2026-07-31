/**
 * Free fonts for share cards — primarily Google Fonts (SIL OFL / Apache).
 * Fonts are loaded on demand so we don't ship every face up front.
 */

export type ShareCardFontId = string;

export type ShareCardFontOption = {
  id: ShareCardFontId;
  /** CSS font-family primary name */
  family: string;
  stack: string;
  labelZh: string;
  labelEn: string;
  source: "google" | "system";
  /** Google Fonts weight list, e.g. "400;500" */
  weights?: string;
};

export const SHARE_CARD_FONT_OPTIONS: ShareCardFontOption[] = [
  {
    id: "quicksand",
    family: "Quicksand",
    stack: 'Quicksand, "Noto Sans SC", sans-serif',
    labelZh: "Quicksand · 圆润",
    labelEn: "Quicksand",
    source: "google",
    weights: "400;500;600",
  },
  {
    id: "noto-sans",
    family: "Noto Sans SC",
    stack: '"Noto Sans SC", "PingFang SC", sans-serif',
    labelZh: "思源黑体",
    labelEn: "Noto Sans SC",
    source: "google",
    weights: "300;400;500",
  },
  {
    id: "noto-serif",
    family: "Noto Serif SC",
    stack: '"Noto Serif SC", Georgia, "Songti SC", serif',
    labelZh: "思源宋体",
    labelEn: "Noto Serif SC",
    source: "google",
    weights: "400;500",
  },
  {
    id: "zcool-xiaowei",
    family: "ZCOOL XiaoWei",
    stack: '"ZCOOL XiaoWei", "Noto Sans SC", sans-serif',
    labelZh: "站酷小薇",
    labelEn: "ZCOOL XiaoWei",
    source: "google",
    weights: "400",
  },
  {
    id: "zcool-qingke",
    family: "ZCOOL QingKe HuangYou",
    stack: '"ZCOOL QingKe HuangYou", "Noto Sans SC", sans-serif',
    labelZh: "站酷庆科黄油体",
    labelEn: "ZCOOL QingKe HuangYou",
    source: "google",
    weights: "400",
  },
  {
    id: "ma-shan-zheng",
    family: "Ma Shan Zheng",
    stack: '"Ma Shan Zheng", "Noto Sans SC", cursive',
    labelZh: "马善政毛笔",
    labelEn: "Ma Shan Zheng",
    source: "google",
    weights: "400",
  },
  {
    id: "zhi-mang-xing",
    family: "Zhi Mang Xing",
    stack: '"Zhi Mang Xing", "Noto Sans SC", cursive',
    labelZh: "芝麻行书",
    labelEn: "Zhi Mang Xing",
    source: "google",
    weights: "400",
  },
  {
    id: "long-cang",
    family: "Long Cang",
    stack: '"Long Cang", "Noto Sans SC", cursive',
    labelZh: "龙藏体",
    labelEn: "Long Cang",
    source: "google",
    weights: "400",
  },
  {
    id: "liu-jian-mao-cao",
    family: "Liu Jian Mao Cao",
    stack: '"Liu Jian Mao Cao", "Noto Sans SC", cursive',
    labelZh: "刘建毛草",
    labelEn: "Liu Jian Mao Cao",
    source: "google",
    weights: "400",
  },
  {
    id: "inter",
    family: "Inter",
    stack: 'Inter, "Noto Sans SC", sans-serif',
    labelZh: "Inter",
    labelEn: "Inter",
    source: "google",
    weights: "400;500;600",
  },
  {
    id: "poppins",
    family: "Poppins",
    stack: 'Poppins, "Noto Sans SC", sans-serif',
    labelZh: "Poppins",
    labelEn: "Poppins",
    source: "google",
    weights: "400;500;600",
  },
  {
    id: "space-grotesk",
    family: "Space Grotesk",
    stack: '"Space Grotesk", "Noto Sans SC", sans-serif',
    labelZh: "Space Grotesk",
    labelEn: "Space Grotesk",
    source: "google",
    weights: "400;500;600",
  },
  {
    id: "playfair",
    family: "Playfair Display",
    stack: '"Playfair Display", "Noto Serif SC", Georgia, serif',
    labelZh: "Playfair Display",
    labelEn: "Playfair Display",
    source: "google",
    weights: "400;500;600",
  },
  {
    id: "jetbrains-mono",
    family: "JetBrains Mono",
    stack: '"JetBrains Mono", ui-monospace, monospace',
    labelZh: "JetBrains Mono",
    labelEn: "JetBrains Mono",
    source: "google",
    weights: "400;500",
  },
  {
    id: "system-sans",
    family: "system-ui",
    stack: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    labelZh: "系统默认",
    labelEn: "System UI",
    source: "system",
  },
];

export const DEFAULT_SHARE_CARD_FONT_ID: ShareCardFontId = "quicksand";

const loadedGoogleFonts = new Set<string>();

function googleCssHref(option: ShareCardFontOption): string {
  const family = option.family.replace(/ /g, "+");
  const weights = option.weights ?? "400";
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
}

export function getShareCardFontOption(
  id: ShareCardFontId,
): ShareCardFontOption {
  return (
    SHARE_CARD_FONT_OPTIONS.find((item) => item.id === id) ??
    SHARE_CARD_FONT_OPTIONS[0]
  );
}

export function resolveShareCardFontStack(id: ShareCardFontId): string {
  return getShareCardFontOption(id).stack;
}

export function shareCardFontLabel(
  id: ShareCardFontId,
  locale: "zh" | "en",
): string {
  const option = getShareCardFontOption(id);
  return locale === "zh" ? option.labelZh : option.labelEn;
}

/** Inject Google Fonts stylesheet and wait until the face can render. */
export async function ensureShareCardFontLoaded(
  id: ShareCardFontId,
): Promise<void> {
  if (typeof document === "undefined") return;
  const option = getShareCardFontOption(id);
  if (option.source !== "google") return;

  if (!loadedGoogleFonts.has(option.id)) {
    const href = googleCssHref(option);
    const existing = document.querySelector<HTMLLinkElement>(
      `link[data-share-card-font="${option.id}"]`,
    );
    if (!existing) {
      await new Promise<void>((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.dataset.shareCardFont = option.id;
        link.onload = () => resolve();
        link.onerror = () =>
          reject(new Error(`Failed to load font: ${option.family}`));
        document.head.appendChild(link);
      }).catch(() => {
        // Still mark attempted; fallback stack may render.
      });
    }
    loadedGoogleFonts.add(option.id);
  }

  if (document.fonts?.load) {
    try {
      await document.fonts.load(`400 54px "${option.family}"`);
      await document.fonts.load(`500 28px "${option.family}"`);
    } catch {
      // ignore load probe failures
    }
  }
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
}
