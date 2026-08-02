"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { PostMeta, Project, RoadmapItem } from "@/lib/content";
import { ContactEditableBody } from "@/components/ContactEditableBody";
import { EditableMindMapList } from "@/components/EditableMindMapList";
import { EditableModuleField } from "@/components/EditableModuleField";
import { EditableModuleSections } from "@/components/EditableModuleSections";
import { EditablePostGrid } from "@/components/EditablePostGrid";
import { EditableProjectGrid } from "@/components/EditableProjectGrid";
import { ModuleAddMenu, type ModuleAddFeatures } from "@/components/ModuleAddMenu";
import { RoadmapTimeline } from "@/components/RoadmapTimeline";
import { DragHandle, SortableItem, SortableList } from "@/components/SortableReorder";
import {
  CONTACT_LINKS_EVENT,
  loadContactLinks,
} from "@/lib/contact-links";
import {
  MODULE_CONTENT_EVENT,
  moduleIntroKey,
  resolveModuleContent,
} from "@/lib/module-content";
import {
  loadModulePageBlocks,
  MODULE_PAGE_BLOCKS_EVENT,
  reorderVisibleModulePageBlocks,
  type ModulePageBlockKind,
} from "@/lib/module-page-blocks";
import {
  loadModuleSections,
  MODULE_SECTIONS_EVENT,
  SECTION_CORE_SLOTS,
  type ModuleSectionDefault,
  type ModuleSectionDef,
} from "@/lib/module-sections";
import {
  loadMindMaps,
  MINDMAP_ITEMS_EVENT,
} from "@/lib/mindmap-edits";
import {
  loadPostItems,
  POST_ITEMS_EVENT,
  postCollectionForModule,
  postFromMeta,
  postHrefPrefixForModule,
} from "@/lib/post-edits";
import {
  loadProjectItems,
  PROJECT_ITEMS_EVENT,
  projectFromContent,
} from "@/lib/project-edits";
import {
  loadRoadmapItems,
  ROADMAP_ITEMS_EVENT,
} from "@/lib/roadmap-edits";

const EMPTY_SECTION_DEFAULTS: ModuleSectionDefault[] = [];
const EMPTY_PROJECTS: Project[] = [];
const EMPTY_POSTS: PostMeta[] = [];
const EMPTY_ROADMAP: RoadmapItem[] = [];

export type ModulePageBlocksConfig = {
  locale: Locale;
  dict: Dictionary;
  moduleId: string;
  accentColor: string;
  /** Intro field defaults (non-contact modules). */
  intro?: {
    fieldKey?: string;
    defaultText: string;
    rows?: number;
  };
  sectionDefaults?: ModuleSectionDefault[];
  projects?: Project[];
  posts?: PostMeta[];
  roadmapItems?: RoadmapItem[];
  addFeatures?: ModuleAddFeatures;
};

function blockLabel(kind: ModulePageBlockKind, dict: Dictionary): string {
  switch (kind) {
    case "intro":
      return dict.pageBlocks.intro;
    case "contact":
      return dict.pageBlocks.contact;
    case "sections":
      return dict.pageBlocks.sections;
    case "projects":
      return dict.pageBlocks.projects;
    case "path":
      return dict.pageBlocks.path;
    case "mindmap":
      return dict.pageBlocks.mindmap;
    case "posts":
      return dict.pageBlocks.posts;
    default:
      return kind;
  }
}

function toSectionLayout(defaults: ModuleSectionDefault[]): ModuleSectionDef[] {
  return defaults.map(({ id, variant, fields, coreSlots }) => ({
    id,
    variant,
    fields: fields ?? [],
    coreSlots: coreSlots ?? [...SECTION_CORE_SLOTS],
  }));
}

function sameKinds(a: ModulePageBlockKind[], b: ModulePageBlockKind[]) {
  return a.length === b.length && a.every((kind, i) => kind === b[i]);
}

function BlockShell({
  index,
  label,
  reorderLabel,
  children,
}: {
  index: number;
  label: string;
  reorderLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="group/item">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] tracking-wide text-white/35">{label}</p>
        <DragHandle index={index} label={reorderLabel} />
      </div>
      {children}
    </div>
  );
}

export function ModulePageBlocks(config: ModulePageBlocksConfig) {
  const {
    locale,
    dict,
    moduleId,
    accentColor,
    intro,
    sectionDefaults = EMPTY_SECTION_DEFAULTS,
    projects = EMPTY_PROJECTS,
    posts = EMPTY_POSTS,
    roadmapItems = EMPTY_ROADMAP,
    addFeatures = {},
  } = config;

  const postCollection = postCollectionForModule(moduleId);
  const configRef = useRef({
    intro,
    sectionDefaults,
    projects,
    posts,
    roadmapItems,
    postCollection,
    showContact: Boolean(addFeatures.contact),
  });
  configRef.current = {
    intro,
    sectionDefaults,
    projects,
    posts,
    roadmapItems,
    postCollection,
    showContact: Boolean(addFeatures.contact),
  };

  const [visible, setVisible] = useState<ModulePageBlockKind[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function blockHasContent(kind: ModulePageBlockKind): boolean {
      const cfg = configRef.current;
      switch (kind) {
        case "intro": {
          if (!cfg.intro) return false;
          const key = cfg.intro.fieldKey ?? moduleIntroKey(moduleId);
          const text = resolveModuleContent(
            locale,
            key,
            cfg.intro.defaultText,
          );
          return text.trim().length > 0;
        }
        case "contact":
          // Contact links are global; only modules that opt in show this block.
          return cfg.showContact && loadContactLinks().length > 0;
        case "sections":
          return (
            loadModuleSections(moduleId, toSectionLayout(cfg.sectionDefaults))
              .length > 0
          );
        case "projects":
          return (
            loadProjectItems(
              moduleId,
              locale,
              cfg.projects.map(projectFromContent),
            ).length > 0
          );
        case "path":
          return (
            loadRoadmapItems(moduleId, locale, cfg.roadmapItems).length > 0
          );
        case "mindmap":
          return loadMindMaps(moduleId, locale, []).length > 0;
        case "posts":
          return (
            loadPostItems(
              cfg.postCollection,
              locale,
              cfg.posts.map((post) => postFromMeta(post)),
            ).length > 0
          );
        default:
          return false;
      }
    }

    function refresh() {
      const nextOrder = loadModulePageBlocks(moduleId);
      const nextVisible = nextOrder.filter(blockHasContent);
      setVisible((prev) =>
        sameKinds(prev, nextVisible) ? prev : nextVisible,
      );
      setReady(true);
    }

    refresh();

    function onUpdate(event: Event) {
      const detail = (event as CustomEvent<{ moduleId?: string }>).detail;
      if (detail?.moduleId && detail.moduleId !== moduleId) return;
      refresh();
    }

    const events = [
      MODULE_PAGE_BLOCKS_EVENT,
      MODULE_SECTIONS_EVENT,
      PROJECT_ITEMS_EVENT,
      POST_ITEMS_EVENT,
      ROADMAP_ITEMS_EVENT,
      MINDMAP_ITEMS_EVENT,
      CONTACT_LINKS_EVENT,
      MODULE_CONTENT_EVENT,
    ];
    for (const name of events) {
      window.addEventListener(name, onUpdate);
    }
    window.addEventListener("storage", onUpdate);
    return () => {
      for (const name of events) {
        window.removeEventListener(name, onUpdate);
      }
      window.removeEventListener("storage", onUpdate);
    };
  }, [locale, moduleId]);

  function handleReorder(from: number, to: number) {
    reorderVisibleModulePageBlocks(moduleId, visible, from, to);
    const nextOrder = loadModulePageBlocks(moduleId);
    const nextVisible = nextOrder.filter((kind) => visible.includes(kind));
    setVisible((prev) => (sameKinds(prev, nextVisible) ? prev : nextVisible));
  }

  function renderBlock(kind: ModulePageBlockKind) {
    switch (kind) {
      case "intro": {
        if (!intro) return null;
        return (
          <EditableModuleField
            locale={locale}
            fieldKey={intro.fieldKey ?? moduleIntroKey(moduleId)}
            defaultText={intro.defaultText}
            editHint={dict.home.noteEdit}
            placeholder={dict.home.pagePlaceholder}
            saveHint={dict.home.pageSaveHint}
            rows={intro.rows ?? 4}
            className="max-w-2xl"
          />
        );
      }
      case "contact":
        return <ContactEditableBody locale={locale} dict={dict} hideAdd />;
      case "sections":
        return (
          <EditableModuleSections
            locale={locale}
            dict={dict}
            moduleId={moduleId}
            accentColor={accentColor}
            defaults={sectionDefaults}
            hideAdd
          />
        );
      case "projects":
        return (
          <EditableProjectGrid
            locale={locale}
            dict={dict}
            moduleId={moduleId}
            projects={projects}
            hideAdd
          />
        );
      case "path":
        return (
          <RoadmapTimeline
            locale={locale}
            moduleId={moduleId}
            items={roadmapItems}
            dict={dict}
            hideAdd
          />
        );
      case "mindmap":
        return (
          <EditableMindMapList
            locale={locale}
            dict={dict}
            moduleId={moduleId}
            accentColor={accentColor}
          />
        );
      case "posts":
        return (
          <EditablePostGrid
            locale={locale}
            dict={dict}
            collection={postCollection}
            posts={posts}
            hrefPrefix={postHrefPrefixForModule(moduleId)}
            readMore={dict.blog.readMore}
            hideAdd
          />
        );
      default:
        return null;
    }
  }

  if (!ready) {
    return (
      <div className="space-y-8" aria-hidden>
        <div className="h-24 rounded-xl border border-white/10 bg-white/[0.02]" />
        <div className="h-24 rounded-xl border border-white/10 bg-white/[0.02]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {visible.length > 0 ? (
        <SortableList count={visible.length} onReorder={handleReorder}>
          <div className="space-y-8">
            {visible.map((kind, index) => (
              <SortableItem key={kind} index={index}>
                <BlockShell
                  index={index}
                  label={blockLabel(kind, dict)}
                  reorderLabel={dict.common.reorder}
                >
                  {renderBlock(kind)}
                </BlockShell>
              </SortableItem>
            ))}
          </div>
        </SortableList>
      ) : null}
      <ModuleAddMenu
        locale={locale}
        dict={dict}
        moduleId={moduleId}
        features={{
          ...addFeatures,
          sectionDefaults: addFeatures.sectionDefaults ?? sectionDefaults,
        }}
      />
    </div>
  );
}
