import Link from "next/link";
import type { ReactNode } from "react";

const URL_PATTERN =
  /https?:\/\/[^\s<>"'`）】》»]+|www\.[^\s<>"'`）】》»]+/gi;

function trimTrailingPunctuation(url: string) {
  return url.replace(/[.,;:!?，。；：！？)、》」』】]+$/g, "");
}

function toHref(raw: string) {
  const cleaned = trimTrailingPunctuation(raw);
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

type Segment =
  | { type: "text"; value: string }
  | { type: "url"; value: string; href: string };

export function splitLinkSegments(text: string): Segment[] {
  if (!text) return [];
  const segments: Segment[] = [];
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    const cleaned = trimTrailingPunctuation(raw);
    const start = match.index;
    const end = start + cleaned.length;

    if (start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    segments.push({
      type: "url",
      value: cleaned,
      href: toHref(cleaned),
    });
    lastIndex = end;
    pattern.lastIndex = end;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

export function hasLinkSegment(text: string) {
  return splitLinkSegments(text).some((segment) => segment.type === "url");
}

interface LinkedTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
  /** When set, non-URL text navigates here (module page). */
  moduleHref?: string;
}

export function LinkedText({
  text,
  className = "",
  linkClassName = "underline decoration-white/25 underline-offset-2 transition-colors hover:decoration-white/60",
  moduleHref,
}: LinkedTextProps) {
  const segments = splitLinkSegments(text);

  const nodes: ReactNode[] = segments.map((segment, index) => {
    if (segment.type === "url") {
      return (
        <a
          key={`url-${index}`}
          href={segment.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          onClick={(event) => event.stopPropagation()}
        >
          {segment.value}
        </a>
      );
    }

    if (!segment.value) return null;

    if (moduleHref) {
      const external =
        /^(https?:|mailto:|tel:)/i.test(moduleHref) ||
        moduleHref.startsWith("//");
      if (external) {
        const isMailOrTel = /^(mailto:|tel:)/i.test(moduleHref);
        return (
          <a
            key={`text-${index}`}
            href={moduleHref}
            target={isMailOrTel ? undefined : "_blank"}
            rel={isMailOrTel ? undefined : "noopener noreferrer"}
            className="underline decoration-white/25 underline-offset-2 transition-colors hover:decoration-white/60 hover:text-white"
            onClick={(event) => event.stopPropagation()}
          >
            {segment.value}
          </a>
        );
      }
      return (
        <Link
          key={`text-${index}`}
          href={moduleHref}
          className="transition-colors hover:text-white"
        >
          {segment.value}
        </Link>
      );
    }

    return <span key={`text-${index}`}>{segment.value}</span>;
  });

  return <span className={className}>{nodes}</span>;
}
