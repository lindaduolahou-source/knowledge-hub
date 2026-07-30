"use client";

import Link from "next/link";
import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { Locale } from "@/i18n/config";
import { useModuleLayout } from "@/hooks/useModuleLayout";
import {
  addBuiltinModule,
  createCustomModule,
  removeActiveModule,
} from "@/lib/module-layout";
import { isBuiltinModuleId, type ModuleConfig } from "@/lib/modules";
import {
  moduleIntroKey,
  saveModuleContent,
} from "@/lib/module-content";
import { useModuleTitle } from "@/hooks/useModuleTitle";
import { ConfirmDialog } from "./ConfirmDialog";
import { EditableModuleTitle } from "./EditableModuleTitle";
import { EditableTocNote } from "./EditableTocNote";

interface ModuleDeckProps {
  locale: Locale;
  dict: Dictionary;
  variant: "list" | "grid";
}

function defaultsFor(
  dict: Dictionary,
  id: string,
): { title: string; description: string } {
  if (isBuiltinModuleId(id)) return dict.modules[id];
  return {
    title: dict.home.newModuleTitle,
    description: dict.home.newModuleDescription,
  };
}

export function ModuleDeck({ locale, dict, variant }: ModuleDeckProps) {
  const { active, hidden, ready } = useModuleLayout();
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleCreateCustom() {
    const id = createCustomModule();
    await saveModuleContent(locale, `${id}:title`, dict.home.newModuleTitle);
    await saveModuleContent(
      locale,
      moduleIntroKey(id),
      dict.home.newModuleDescription,
    );
    const { saveTocNote } = await import("@/lib/toc-notes");
    await saveTocNote(locale, id, dict.home.newModuleDescription);
    setPickerOpen(false);
  }

  if (!ready) {
    return (
      <div
        className={
          variant === "grid"
            ? "grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            : "divide-y divide-white/10 border-y border-white/10"
        }
        aria-hidden
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={
              variant === "grid"
                ? "h-28 rounded-xl border border-white/10 bg-black/30"
                : "h-16"
            }
          />
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div>
        <ol className="divide-y divide-white/10 border-y border-white/10">
          {active.map((mod, index) => (
            <ModuleListItem
              key={mod.id}
              locale={locale}
              dict={dict}
              mod={mod}
              index={index}
              canRemove={active.length > 1}
            />
          ))}
        </ol>
        <AddModulePanel
          locale={locale}
          dict={dict}
          hidden={hidden}
          pickerOpen={pickerOpen}
          setPickerOpen={setPickerOpen}
          onRestore={addBuiltinModule}
          onCreateCustom={handleCreateCustom}
          variant="list"
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((mod, index) => (
          <ModuleGridCard
            key={mod.id}
            locale={locale}
            dict={dict}
            mod={mod}
            index={index}
            canRemove={active.length > 1}
          />
        ))}
        <li>
          <AddModulePanel
            locale={locale}
            dict={dict}
            hidden={hidden}
            pickerOpen={pickerOpen}
            setPickerOpen={setPickerOpen}
            onRestore={addBuiltinModule}
            onCreateCustom={handleCreateCustom}
            variant="grid"
          />
        </li>
      </ul>
    </div>
  );
}

function ModuleListItem({
  locale,
  dict,
  mod,
  index,
  canRemove,
}: {
  locale: Locale;
  dict: Dictionary;
  mod: ModuleConfig;
  index: number;
  canRemove: boolean;
}) {
  const defaults = defaultsFor(dict, mod.id);
  const liveTitle = useModuleTitle(locale, mod.id, defaults.title);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <li className="landing-module group/card py-5">
      <div className="flex items-start gap-4 sm:gap-6">
        <span className="w-8 shrink-0 pt-0.5 text-sm tabular-nums text-white/35">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <EditableModuleTitle
              locale={locale}
              moduleId={mod.id}
              defaultText={defaults.title}
              editHint={dict.home.noteEdit}
              placeholder={dict.home.titlePlaceholder}
              saveHint={dict.home.noteSaveHint}
              size="toc"
              className="min-w-0 flex-1"
              href={`/${locale}${mod.href}`}
            />
            <Link
              href={`/${locale}${mod.href}`}
              className="mt-0.5 shrink-0 cursor-pointer text-sm text-white/25 transition-all hover:translate-x-0.5 hover:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              aria-label={liveTitle}
              tabIndex={-1}
            >
              →
            </Link>
            {canRemove && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="mt-0.5 shrink-0 cursor-pointer rounded px-1.5 text-sm opacity-0 pointer-events-none transition-opacity group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-hover/card:text-white/35 hover:!text-white/70 focus-visible:pointer-events-auto focus-visible:opacity-100"
                aria-label={dict.home.removeModule}
                title={dict.home.removeModule}
              >
                ×
              </button>
            )}
          </div>

          <EditableTocNote
            locale={locale}
            moduleId={mod.id}
            defaultText={defaults.description}
            editHint={dict.home.noteEdit}
            placeholder={dict.home.notePlaceholder}
            saveHint={dict.home.noteSaveHint}
            href={`/${locale}${mod.href}`}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        message={dict.home.removeModuleConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={() => {
          removeActiveModule(mod.id, { title: liveTitle });
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  );
}

function ModuleGridCard({
  locale,
  dict,
  mod,
  index,
  canRemove,
}: {
  locale: Locale;
  dict: Dictionary;
  mod: ModuleConfig;
  index: number;
  canRemove: boolean;
}) {
  const defaults = defaultsFor(dict, mod.id);
  const liveTitle = useModuleTitle(locale, mod.id, defaults.title);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <li
      className="explore-node group/card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="h-full rounded-xl border border-white/20 bg-black/45 px-4 py-4 backdrop-blur-md transition-colors hover:border-white/35">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] tracking-[0.18em] text-white/40">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-2">
            {canRemove && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="cursor-pointer text-sm leading-none opacity-0 pointer-events-none transition-opacity group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-hover/card:text-white/35 hover:!text-white/70 focus-visible:pointer-events-auto focus-visible:opacity-100"
                aria-label={dict.home.removeModule}
                title={dict.home.removeModule}
              >
                ×
              </button>
            )}
            <span className="h-1.5 w-1.5 rounded-full bg-white/55" />
          </div>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          message={dict.home.removeModuleConfirm}
          confirmLabel={dict.common.confirm}
          cancelLabel={dict.common.cancel}
          onConfirm={() => {
            removeActiveModule(mod.id, { title: liveTitle });
            setConfirmOpen(false);
          }}
          onCancel={() => setConfirmOpen(false)}
        />

        <div className="flex items-start gap-1.5">
          <EditableModuleTitle
            locale={locale}
            moduleId={mod.id}
            defaultText={defaults.title}
            editHint={dict.home.noteEdit}
            placeholder={dict.home.titlePlaceholder}
            saveHint={dict.home.noteSaveHint}
            size="toc"
            className="min-w-0 flex-1"
            href={`/${locale}${mod.href}`}
          />
          <Link
            href={`/${locale}${mod.href}`}
            className="mt-0.5 shrink-0 cursor-pointer text-sm text-white/25 transition-all hover:translate-x-0.5 hover:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={liveTitle}
            tabIndex={-1}
          >
            →
          </Link>
        </div>

        <EditableTocNote
          locale={locale}
          moduleId={mod.id}
          defaultText={defaults.description}
          editHint={dict.home.noteEdit}
          placeholder={dict.home.notePlaceholder}
          saveHint={dict.home.noteSaveHint}
          compact
          href={`/${locale}${mod.href}`}
        />
      </div>
    </li>
  );
}

function AddModulePanel({
  dict,
  hidden,
  pickerOpen,
  setPickerOpen,
  onRestore,
  onCreateCustom,
  variant,
}: {
  locale: Locale;
  dict: Dictionary;
  hidden: ReturnType<typeof useModuleLayout>["hidden"];
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  onRestore: (id: (typeof hidden)[number]) => void;
  onCreateCustom: () => void;
  variant: "list" | "grid";
}) {
  const shellClass =
    variant === "grid"
      ? "flex h-full min-h-[8.5rem] flex-col justify-center rounded-xl border border-dashed border-white/25 bg-black/25 px-4 py-4"
      : "mt-4 rounded-xl border border-dashed border-white/20 px-4 py-4";

  return (
    <div className={shellClass}>
      {!pickerOpen ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="cursor-pointer text-left text-sm text-white/45 transition-colors hover:text-white/80"
        >
          <span className="mr-2 text-base text-white/50">+</span>
          {dict.home.addModule}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs tracking-wide text-white/40">
              {dict.home.addModuleHint}
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="cursor-pointer text-xs text-white/35 hover:text-white/70"
            >
              {dict.home.cancelAdd}
            </button>
          </div>

          {hidden.length > 0 && (
            <ul className="space-y-1.5">
              {hidden.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      onRestore(id);
                      setPickerOpen(false);
                    }}
                    className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/75 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
                  >
                    + {dict.modules[id].title}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={onCreateCustom}
            className="w-full cursor-pointer rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/15"
          >
            + {dict.home.createCustomModule}
          </button>
        </div>
      )}
    </div>
  );
}
