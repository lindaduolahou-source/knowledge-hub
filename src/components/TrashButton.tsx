"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import {
  emptyTrashPermanently,
  getHiddenBuiltinIds,
  MODULE_LAYOUT_EVENT,
  permanentlyDeleteFromTrash,
  restoreModuleFromTrash,
} from "@/lib/module-layout";
import { getModule, isBuiltinModuleId } from "@/lib/modules";
import {
  findTrashModule,
  getTrashItems,
  isDismissedBuiltin,
  pushModuleToTrash,
  removeTrashItem,
  TRASH_EVENT,
  type TrashItem,
} from "@/lib/trash";
import { restoreTrashContent } from "@/lib/trash-actions";
import { ConfirmDialog } from "./ConfirmDialog";

interface TrashButtonProps {
  locale: Locale;
  dict: Dictionary;
  immersive?: boolean;
}

function formatDeletedAt(ts: number, locale: Locale) {
  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

function migrateHiddenBuiltins(dict: Dictionary) {
  for (const id of getHiddenBuiltinIds()) {
    if (findTrashModule(id) || isDismissedBuiltin(id)) continue;
    const mod = getModule(id);
    pushModuleToTrash({
      moduleId: id,
      title: dict.modules[id].title,
      icon: mod.icon,
    });
  }
}

function kindLabel(item: TrashItem, dict: Dictionary) {
  switch (item.kind) {
    case "module":
      return isBuiltinModuleId(item.moduleId)
        ? dict.trash.kindModule
        : dict.trash.kindCustomModule;
    case "section":
      return dict.trash.kindSection;
    case "project":
      return dict.trash.kindProject;
    case "post":
      return dict.trash.kindPost;
    case "roadmap":
      return dict.trash.kindRoadmap;
    case "contact":
      return dict.trash.kindContact;
    case "vault-card":
      return dict.trash.kindVaultCard;
    case "card-template":
      return dict.trash.kindCardTemplate;
    case "field":
      return dict.trash.kindField;
    case "mindmap":
      return dict.trash.kindMindMap;
    case "mindmap-template":
      return dict.trash.kindMindMapTemplate;
    case "mindmap-style":
      return dict.trash.kindMindMapStyle;
    default:
      return dict.trash.kindItem;
  }
}

function itemIcon(item: TrashItem) {
  switch (item.kind) {
    case "module":
      return item.icon ?? "◇";
    case "section":
      return "▣";
    case "project":
      return "⬡";
    case "post":
      return "✦";
    case "roadmap":
      return "◎";
    case "contact":
      return "✉";
    case "vault-card":
      return item.card.moduleIcon || "▭";
    case "card-template":
      return item.template.moduleIcon || "▤";
    case "field":
      return "▥";
    case "mindmap":
      return "◈";
    case "mindmap-template":
      return "▤";
    case "mindmap-style":
      return "╱";
    default:
      return "·";
  }
}

function restoreItem(item: TrashItem) {
  if (item.kind === "module") {
    restoreModuleFromTrash(item.moduleId);
    return;
  }
  if (restoreTrashContent(item)) {
    removeTrashItem(item.id);
  }
}

export function TrashButton({ locale, dict, immersive }: TrashButtonProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TrashItem[]>([]);
  const [pending, setPending] = useState<
    null | { type: "empty" } | { type: "delete"; id: string }
  >(null);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  function refresh() {
    migrateHiddenBuiltins(dict);
    setItems(getTrashItems());
  }

  useEffect(() => {
    refresh();
    window.addEventListener(TRASH_EVENT, refresh);
    window.addEventListener(MODULE_LAYOUT_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TRASH_EVENT, refresh);
      window.removeEventListener(MODULE_LAYOUT_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh uses latest dict via closure on open
  }, [dict]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (pending) return;
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (pending) {
        setPending(null);
        return;
      }
      setOpen(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, pending]);

  const count = items.length;
  const buttonClass = immersive
    ? "border border-white/35 text-white hover:bg-white/15"
    : "border border-border text-muted hover:bg-surface hover:text-foreground";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) refresh();
          setOpen((v) => !v);
        }}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ${buttonClass}`}
        aria-label={dict.trash.open}
        aria-expanded={open}
        aria-controls={panelId}
        title={dict.trash.open}
      >
        <Trash2 size={15} strokeWidth={1.75} />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={dict.trash.title}
          className={`absolute right-0 z-50 mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-xl border shadow-2xl ${
            immersive
              ? "border-white/20 bg-black/90 text-white backdrop-blur-md"
              : "border-border bg-background text-foreground"
          }`}
        >
          <div
            className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${
              immersive ? "border-white/10" : "border-border"
            }`}
          >
            <div>
              <p className="text-sm font-medium">{dict.trash.title}</p>
              <p
                className={`mt-0.5 text-xs ${
                  immersive ? "text-white/45" : "text-muted"
                }`}
              >
                {dict.trash.subtitle}
              </p>
            </div>
            {count > 0 && (
              <button
                type="button"
                onClick={() => setPending({ type: "empty" })}
                className={`cursor-pointer whitespace-nowrap text-xs transition-colors ${
                  immersive
                    ? "text-white/45 hover:text-white/80"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {dict.trash.empty}
              </button>
            )}
          </div>

          <ul className="max-h-[min(60vh,22rem)] overflow-y-auto py-1">
            {items.length === 0 ? (
              <li
                className={`px-4 py-8 text-center text-sm ${
                  immersive ? "text-white/40" : "text-muted"
                }`}
              >
                {dict.trash.emptyState}
              </li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className={`border-b px-4 py-3 last:border-b-0 ${
                    immersive ? "border-white/5" : "border-border/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                        immersive ? "bg-white/10" : "bg-surface"
                      }`}
                      aria-hidden
                    >
                      {itemIcon(item)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] ${
                          immersive ? "text-white/40" : "text-muted"
                        }`}
                      >
                        {kindLabel(item, dict)} ·{" "}
                        {formatDeletedAt(item.deletedAt, locale)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            restoreItem(item);
                            refresh();
                          }}
                          className={`cursor-pointer rounded-md px-2.5 py-1 text-xs transition-colors ${
                            immersive
                              ? "bg-white/15 text-white hover:bg-white/25"
                              : "bg-accent/15 text-accent hover:bg-accent/25"
                          }`}
                        >
                          {dict.trash.restore}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPending({ type: "delete", id: item.id })
                          }
                          className={`cursor-pointer rounded-md px-2.5 py-1 text-xs transition-colors ${
                            immersive
                              ? "text-white/45 hover:bg-white/10 hover:text-white/80"
                              : "text-muted hover:bg-surface hover:text-foreground"
                          }`}
                        >
                          {dict.trash.deleteForever}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        message={
          pending?.type === "empty"
            ? dict.trash.emptyConfirm
            : dict.trash.deleteConfirm
        }
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={() => {
          if (pending?.type === "empty") {
            emptyTrashPermanently();
          } else if (pending?.type === "delete") {
            permanentlyDeleteFromTrash(pending.id);
          }
          setPending(null);
          refresh();
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
