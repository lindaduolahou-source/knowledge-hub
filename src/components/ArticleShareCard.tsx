import { ShareCardLauncher } from "@/components/ShareCardLauncher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { ModuleId } from "@/lib/modules";
import { getModule, isBuiltinModuleId } from "@/lib/modules";

/** Light markdown → plain text for share-card field defaults. */
export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface ArticleShareCardProps {
  locale: Locale;
  dict: Dictionary;
  /** Parent module id, e.g. thoughts / knowledge. */
  moduleId: ModuleId;
  /** Article slug — drafts are stored per article. */
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags?: string[];
}

export function ArticleShareCard({
  locale,
  dict,
  moduleId,
  slug,
  title,
  excerpt,
  content,
  tags = [],
}: ArticleShareCardProps) {
  const mod = isBuiltinModuleId(moduleId) ? getModule(moduleId) : null;
  const body = markdownToPlainText(content);
  const tagLine = tags.filter(Boolean).join(" · ");

  return (
    <ShareCardLauncher
      locale={locale}
      dict={dict}
      moduleId={`${moduleId}:${slug}`}
      moduleIcon={mod?.icon ?? "✦"}
      titleDefault={title}
      floating
      fields={[
        {
          id: "excerpt",
          label: dict.shareCard.fieldExcerpt,
          defaultText: excerpt,
        },
        {
          id: "body",
          label: dict.shareCard.fieldBody,
          defaultText: body,
        },
        ...(tagLine
          ? [
              {
                id: "tags",
                label: dict.shareCard.fieldTags,
                defaultText: tagLine,
              },
            ]
          : []),
      ]}
    />
  );
}
