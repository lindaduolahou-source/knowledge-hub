"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { LinkedText } from "./LinkedText";

export interface EditableLocalTextProps {
  locale: Locale;
  fieldKey: string;
  defaultText: string;
  editHint: string;
  placeholder: string;
  saveHint: string;
  /** Resolve / save / sync backed by a personal store */
  resolve: (locale: Locale, key: string, defaultText: string) => string;
  save: (locale: Locale, key: string, value: string) => Promise<unknown>;
  ensureSync: () => Promise<void>;
  eventName: string;
  rows?: number;
  /** When true, Enter commits (Shift+Enter newline). When false, Ctrl/Cmd+Enter commits. */
  commitOnEnter?: boolean;
  /** How to render saved text */
  variant?: "plain" | "list" | "chips";
  accentColor?: string;
  className?: string;
  textClassName?: string;
  muted?: boolean;
  /** Skip default text color classes so parent color can inherit */
  inheritColor?: boolean;
  /**
   * When set, the text itself navigates instead of entering edit mode.
   * Editing is triggered by a separate control.
   */
  href?: string;
}

const syncPromises = new Map<string, Promise<void>>();

function ensureSyncedOnce(eventName: string, ensureSync: () => Promise<void>) {
  let promise = syncPromises.get(eventName);
  if (!promise) {
    promise = ensureSync();
    syncPromises.set(eventName, promise);
  }
  return promise;
}

function splitLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitChips(text: string) {
  return text
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function EditableLocalText({
  locale,
  fieldKey,
  defaultText,
  editHint,
  placeholder,
  saveHint,
  resolve,
  save,
  ensureSync,
  eventName,
  rows = 3,
  commitOnEnter = false,
  variant = "plain",
  accentColor = "#b7c4ce",
  className = "",
  textClassName = "",
  muted = true,
  inheritColor = false,
  href,
}: EditableLocalTextProps) {
  const [text, setText] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editingRef = useRef(false);
  const skipBlurCommitRef = useRef(false);

  function refresh() {
    const resolved = resolve(locale, fieldKey, defaultText);
    setText(resolved);
    if (!editingRef.current) setDraft(resolved);
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      await ensureSyncedOnce(eventName, ensureSync);
      if (!cancelled) refresh();
    }
    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, fieldKey, defaultText, eventName]);

  useEffect(() => {
    function onUpdate(event: Event) {
      const detail = (event as CustomEvent<{ locale?: Locale }>).detail;
      if (detail?.locale && detail.locale !== locale) return;
      refresh();
    }
    window.addEventListener(eventName, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(eventName, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, fieldKey, defaultText, eventName]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const el = inputRef.current;
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  function startEdit() {
    setDraft(text ?? "");
    editingRef.current = true;
    setEditing(true);
  }

  function commit() {
    const next = draft.trim();
    editingRef.current = false;
    setText(next);
    setEditing(false);
    void save(locale, fieldKey, next);
  }

  function cancel() {
    skipBlurCommitRef.current = true;
    editingRef.current = false;
    setDraft(text ?? "");
    setEditing(false);
  }

  if (text === null) {
    return (
      <span
        className={`block min-h-5 ${className}`}
        aria-hidden
      />
    );
  }

  if (editing) {
    return (
      <div
        className={className}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (skipBlurCommitRef.current) {
              skipBlurCommitRef.current = false;
              return;
            }
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
              return;
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              skipBlurCommitRef.current = true;
              commit();
              return;
            }
            if (commitOnEnter && e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              skipBlurCommitRef.current = true;
              commit();
            }
          }}
          className="w-full resize-y rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted/60 focus:border-white/40"
        />
        <p className="mt-1 text-[11px] text-muted/70">{saveHint}</p>
      </div>
    );
  }

  const displayClass = inheritColor
    ? ""
    : muted
      ? "text-muted hover:text-foreground/80"
      : "text-foreground hover:text-white";

  const body = !text ? (
    <span className="text-sm text-muted/40">{placeholder}</span>
  ) : variant === "list" ? (
    <ul className="space-y-2">
      {splitLines(text).map((item) => (
        <li
          key={item}
          className={`flex items-center gap-3 text-sm ${displayClass}`}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <LinkedText text={item} moduleHref={href} />
        </li>
      ))}
    </ul>
  ) : variant === "chips" ? (
    <div className="flex flex-wrap gap-2">
      {splitChips(text).map((skill) => (
        <span
          key={skill}
          className="rounded border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
        >
          <LinkedText
            text={skill}
            linkClassName="underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
          />
        </span>
      ))}
    </div>
  ) : (
    <LinkedText
      text={text}
      moduleHref={href}
      className={`inline whitespace-pre-wrap ${
        textClassName || "text-sm leading-relaxed sm:text-base"
      } ${displayClass}`}
    />
  );

  if (href) {
    return (
      <div className={`group/note flex min-w-0 items-start gap-1.5 ${className}`}>
        <div className="min-w-0 flex-1 text-left">{body}</div>
        <button
          type="button"
          onClick={startEdit}
          title={editHint}
          className="mt-0.5 shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-transparent transition-colors group-hover/note:text-white/40 hover:!text-white/70 focus-visible:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {editHint}
        </button>
      </div>
    );
  }

  return (
    <div className={`group/note flex min-w-0 items-start gap-1.5 ${className}`}>
      <div className="min-w-0 flex-1 text-left">{body}</div>
      <button
        type="button"
        onClick={startEdit}
        title={editHint}
        className="mt-0.5 shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-transparent transition-colors group-hover/note:text-muted/60 hover:!text-foreground/80 focus-visible:text-foreground/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {editHint}
      </button>
    </div>
  );
}
