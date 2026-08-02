"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { PostMeta, Project, RoadmapItem } from "@/lib/content";
import {
  contactLabelKey,
  contactValueKey,
  createContactLink,
  loadContactLinks,
} from "@/lib/contact-links";
import { saveModuleContent } from "@/lib/module-content";
import {
  createModuleSection,
  loadModuleSections,
  sectionBodyKey,
  sectionTitleKey,
  type ModuleSectionDef,
  type SectionVariant,
} from "@/lib/module-sections";
import {
  createPostItem,
  loadPostItems,
  postCollectionForModule,
  postDetailHref,
  postFromMeta,
} from "@/lib/post-edits";
import {
  createProjectItem,
  loadProjectItems,
  projectDetailHref,
  projectFromContent,
} from "@/lib/project-edits";
import {
  createRoadmapItem,
  loadRoadmapItems,
  requestRoadmapEdit,
} from "@/lib/roadmap-edits";
import {
  createMindMap,
  loadMindMaps,
  requestMindMapEdit,
} from "@/lib/mindmap-edits";

export type ModuleAddFeatures = {
  /** Contact module only — adds “联系方式”. */
  contact?: boolean;
  sectionDefaults?: ModuleSectionDef[];
  projectDefaults?: Project[];
  postDefaults?: PostMeta[];
  roadmapDefaults?: RoadmapItem[];
};

interface ModuleAddMenuProps {
  locale: Locale;
  dict: Dictionary;
  moduleId: string;
  features?: ModuleAddFeatures;
}

type Panel = "root" | "section";
type Choice = "section" | "project" | "post" | "path" | "mindmap" | "contact";

export function ModuleAddMenu({
  locale,
  dict,
  moduleId,
  features = {},
}: ModuleAddMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("root");
  const postCollection = postCollectionForModule(moduleId);

  const choices: Choice[] = [
    "section",
    "project",
    "path",
    "mindmap",
    "post",
    ...(features.contact ? (["contact"] as const) : []),
  ];

  function close() {
    setOpen(false);
    setPanel("root");
  }

  async function addSection(variant: SectionVariant) {
    const defaults = features.sectionDefaults ?? [];
    const current = loadModuleSections(moduleId, defaults);
    const { id } = createModuleSection(moduleId, current, variant);
    await saveModuleContent(
      locale,
      sectionTitleKey(moduleId, id),
      dict.home.newSectionTitle,
    );
    await saveModuleContent(
      locale,
      sectionBodyKey(moduleId, id),
      dict.home.newSectionBody,
    );
    close();
  }

  function addProject() {
    const defaults = (features.projectDefaults ?? []).map(projectFromContent);
    const current = loadProjectItems(moduleId, locale, defaults);
    const { slug } = createProjectItem(
      moduleId,
      locale,
      current,
      {
        title: dict.projects.newProjectTitle,
        description: dict.projects.newProjectBody,
        content: dict.projects.newProjectContent,
      },
      defaults,
    );
    close();
    router.push(`${projectDetailHref(locale, moduleId, slug)}?edit=1`);
  }

  function addPost() {
    const defaults = (features.postDefaults ?? []).map((post) =>
      postFromMeta(post),
    );
    const current = loadPostItems(postCollection, locale, defaults);
    const { slug } = createPostItem(
      postCollection,
      locale,
      current,
      {
        title: dict.posts.newPostTitle,
        excerpt: dict.posts.newPostExcerpt,
        content: dict.posts.newPostBody,
      },
      defaults,
    );
    close();
    router.push(`${postDetailHref(locale, moduleId, slug)}?edit=1`);
  }

  function addPath() {
    const defaults = features.roadmapDefaults ?? [];
    const current = loadRoadmapItems(moduleId, locale, defaults);
    const { id } = createRoadmapItem(
      moduleId,
      locale,
      current,
      {
        title: dict.roadmap.newStageTitle,
        description: dict.roadmap.newStageBody,
      },
      defaults,
    );
    requestRoadmapEdit(moduleId, id);
    close();
  }

  async function addContact() {
    const current = loadContactLinks();
    const { id } = createContactLink(current);
    await saveModuleContent(
      locale,
      contactLabelKey(id, "custom")!,
      dict.contact.newLinkLabel,
    );
    await saveModuleContent(
      locale,
      contactValueKey(id, "custom"),
      dict.contact.newLinkValue,
    );
    close();
  }

  function addMindMap() {
    const current = loadMindMaps(moduleId, locale, []);
    const { id } = createMindMap(moduleId, locale, current, {
      title: dict.mindmap.newMapTitle,
      rootText: dict.mindmap.newRootText,
      branchText: dict.mindmap.newBranchText,
    });
    requestMindMapEdit(moduleId, id);
    close();
  }

  function choiceLabel(kind: Choice) {
    switch (kind) {
      case "section":
        return dict.home.addSection;
      case "project":
        return dict.projects.addProject;
      case "post":
        return dict.posts.addPost;
      case "path":
        return dict.roadmap.addPath;
      case "mindmap":
        return dict.mindmap.addMap;
      case "contact":
        return dict.contact.addLink;
    }
  }

  function onPickRoot(kind: Choice) {
    if (kind === "section") {
      setPanel("section");
      return;
    }
    if (kind === "project") addProject();
    else if (kind === "post") addPost();
    else if (kind === "path") addPath();
    else if (kind === "mindmap") addMindMap();
    else if (kind === "contact") void addContact();
  }

  return (
    <div className="rounded-xl border border-dashed border-white/20 px-4 py-3">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setPanel("root");
            setOpen(true);
          }}
          className="cursor-pointer text-sm text-white/45 transition-colors hover:text-white/80"
        >
          <span className="mr-2 text-base text-white/50">+</span>
          {dict.home.addContent}
        </button>
      ) : panel === "root" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-white/40">{dict.home.addContentHint}</p>
            <button
              type="button"
              onClick={close}
              className="cursor-pointer text-xs text-white/35 hover:text-white/70"
            >
              {dict.home.cancelAdd}
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {choices.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => onPickRoot(kind)}
                className="w-full cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-sm text-white/75 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                + {choiceLabel(kind)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-white/40">{dict.home.addSectionHint}</p>
            <button
              type="button"
              onClick={() => setPanel("root")}
              className="cursor-pointer text-xs text-white/35 hover:text-white/70"
            >
              {dict.home.addContentBack}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["plain", dict.home.sectionVariantPlain],
                ["list", dict.home.sectionVariantList],
                ["chips", dict.home.sectionVariantChips],
              ] as const
            ).map(([variant, label]) => (
              <button
                key={variant}
                type="button"
                onClick={() => void addSection(variant)}
                className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                + {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
