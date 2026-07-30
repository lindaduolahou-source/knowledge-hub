"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ModuleId } from "@/lib/modules";
import type { Locale } from "@/i18n/config";
import {
  ensureCrossLocaleTocNotes,
  resolveTocNote,
  saveTocNote,
  TOC_NOTES_EVENT,
} from "@/lib/toc-notes";
import { LinkedText } from "./LinkedText";

interface EditableTocNoteProps {
  locale: Locale;
  moduleId: ModuleId;
  defaultText: string;
  editHint: string;
  placeholder: string;
  saveHint: string;
  /** Visual density for homepage vs explore */
  compact?: boolean;
  /**
   * When set, the note text navigates instead of entering edit mode.
   * Editing is triggered by a separate control.
   */
  href?: string;
}

let syncPromise: Promise<void> | null = null;

function ensureSyncedOnce() {
  if (!syncPromise) {
    syncPromise = ensureCrossLocaleTocNotes();
  }
  return syncPromise;
}

export function EditableTocNote({
  locale,
  moduleId,
  defaultText,
  editHint,
  placeholder,
  saveHint,
  compact = false,
  href,
}: EditableTocNoteProps) {
  const [text, setText] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editingRef = useRef(false);
  const skipBlurCommitRef = useRef(false);

  function refresh() {
    const resolved = resolveTocNote(locale, moduleId, defaultText);
    setText(resolved);
    if (!editingRef.current) setDraft(resolved);
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      await ensureSyncedOnce();
      if (!cancelled) refresh();
    }

    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, moduleId, defaultText]);

  useEffect(() => {
    function onUpdate(event: Event) {
      const detail = (event as CustomEvent<{ locale?: Locale }>).detail;
      if (detail?.locale && detail.locale !== locale) return;
      refresh();
    }
    window.addEventListener(TOC_NOTES_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(TOC_NOTES_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, moduleId, defaultText]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
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
    void saveTocNote(locale, moduleId, next);
  }

  function cancel() {
    skipBlurCommitRef.current = true;
    editingRef.current = false;
    setDraft(text ?? "");
    setEditing(false);
  }

  // Avoid flashing dictionary defaults before localStorage resolves
  // (especially after the user cleared a note to empty).
  if (text === null) {
    return (
      <span
        className={`block ${compact ? "mt-1.5 min-h-4 text-xs" : "mt-1 min-h-5 text-sm"}`}
        aria-hidden
      />
    );
  }

  if (editing) {
    return (
      <div
        className="mt-2"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          rows={2}
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
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              skipBlurCommitRef.current = true;
              commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className="w-full resize-none rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm leading-relaxed text-white outline-none placeholder:text-white/30 focus:border-white/50"
        />
        <p className="mt-1 text-[11px] text-white/35">{saveHint}</p>
      </div>
    );
  }

  const body = text ? (
    <LinkedText text={text} moduleHref={href} className="inline" />
  ) : href ? (
    <Link
      href={href}
      className="inline text-white/25 transition-colors hover:text-white/50"
    >
      {placeholder}
    </Link>
  ) : (
    <span className="inline text-white/25">{placeholder}</span>
  );

  const densityClass = compact
    ? "mt-1.5 text-xs text-white/45 hover:text-white/70"
    : "mt-1 text-sm text-white/40 hover:text-white/70";

  if (href) {
    return (
      <div
        className={`group/note flex min-w-0 items-start gap-1.5 ${densityClass}`}
      >
        <div className="min-w-0 flex-1 px-0.5 py-0.5 text-left">{body}</div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startEdit();
          }}
          title={editHint}
          className="mt-0.5 shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-transparent transition-colors group-hover/note:text-white/35 hover:!text-white/70 focus-visible:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {editHint}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group/note flex min-w-0 items-start gap-1.5 ${densityClass}`}
    >
      <div className="min-w-0 flex-1 px-0.5 py-0.5 text-left">{body}</div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startEdit();
        }}
        title={editHint}
        className="mt-0.5 shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-transparent transition-colors group-hover/note:text-white/35 hover:!text-white/70 focus-visible:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {editHint}
      </button>
    </div>
  );
}
