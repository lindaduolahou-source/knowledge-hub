"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MindMapLibraryDialog } from "@/components/MindMapLibraryDialog";
import { MindMapTemplateDialog } from "@/components/MindMapTemplateDialog";
import { DragHandle, SortableItem, SortableList } from "@/components/SortableReorder";
import {
  addMindMapChild,
  layoutMindMap,
  loadMindMaps,
  MINDMAP_FOCUS_EDIT_EVENT,
  MINDMAP_ITEMS_EVENT,
  relocateMindMapNode,
  removeMindMap,
  removeMindMapNode,
  reorderMindMaps,
  updateMindMap,
  type LaidOutNode,
  type MindMapDoc,
} from "@/lib/mindmap-edits";
import {
  libraryItemToMindMapTemplate,
  loadMindMapLibrary,
  MINDMAP_LIBRARY_EVENT,
  removeMindMapLibraryTemplate,
  saveMindMapToLibrary,
  type MindMapLibraryTemplate,
} from "@/lib/mindmap-library";
import {
  libraryStyleToPayload,
  loadMindMapStyleLibrary,
  MINDMAP_STYLE_LIBRARY_EVENT,
  removeMindMapStyleFromLibrary,
  saveMindMapStyleToLibrary,
  type MindMapLibraryStyle,
} from "@/lib/mindmap-style-library";
import {
  contrastTextColor,
  DEFAULT_MINDMAP_NODE_BG,
  edgeStyleToPayload,
  ensureMindMapFontLoaded,
  MINDMAP_EDGE_STYLE_TEMPLATES,
  MINDMAP_NODE_COLORS,
  mindMapEdgePathD,
  mindMapFontOptions,
  payloadToEdgeStyle,
  readMindMapStylePackFile,
  resolveDocEdgeStyle,
  resolveMindMapFontStack,
  stylePackFromEdge,
  type MindMapEdgeStyle,
  type MindMapEdgeStylePayload,
} from "@/lib/mindmap-style";
import {
  BUILTIN_MINDMAP_TEMPLATES,
  builtinToMindMapTemplate,
  docToMindMapTemplate,
  expandTemplateTree,
  exportMindMapTemplateFile,
  readMindMapImportFile,
  type MindMapTemplate,
} from "@/lib/mindmap-template";

interface EditableMindMapListProps {
  locale: Locale;
  dict: Dictionary;
  moduleId: string;
  accentColor?: string;
}

const PAD = 48;
const NODE_W = 128;
const NODE_H = 36;
const DRAG_HANDLE_W = 16;
/** Pixels of movement before a press on the node body becomes a drag. */
const DRAG_THRESHOLD_PX = 8;

export function EditableMindMapList({
  locale,
  dict,
  moduleId,
  accentColor = "#7dd3c0",
}: EditableMindMapListProps) {
  const [items, setItems] = useState<MindMapDoc[]>([]);
  const [ready, setReady] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pendingRemoveNodeId, setPendingRemoveNodeId] = useState<string | null>(
    null,
  );
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySavedHint, setLibrarySavedHint] = useState(false);
  const [styleSavedHint, setStyleSavedHint] = useState(false);
  const [boardImportError, setBoardImportError] = useState<string | null>(null);
  const [styleImportError, setStyleImportError] = useState<string | null>(null);
  const [boardLibraryExpanded, setBoardLibraryExpanded] = useState(false);
  const [styleLibrary, setStyleLibrary] = useState<MindMapLibraryStyle[]>([]);
  const [templateLibrary, setTemplateLibrary] = useState<
    MindMapLibraryTemplate[]
  >([]);
  const [pendingRemoveStyleId, setPendingRemoveStyleId] = useState<
    string | null
  >(null);
  const [pendingRemoveTemplateId, setPendingRemoveTemplateId] = useState<
    string | null
  >(null);
  const boardImportRef = useRef<HTMLInputElement>(null);
  const styleImportRef = useRef<HTMLInputElement>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const dragNodeIdRef = useRef<string | null>(null);
  const dropTargetIdRef = useRef<string | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const pendingDragRef = useRef<{
    nodeId: string;
    clientX: number;
    clientY: number;
    x: number;
    y: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    function refresh() {
      setItems(loadMindMaps(moduleId, locale, []));
      setReady(true);
    }
    function refreshStyles() {
      setStyleLibrary(loadMindMapStyleLibrary());
    }
    function refreshTemplates() {
      setTemplateLibrary(loadMindMapLibrary());
    }
    refresh();
    refreshStyles();
    refreshTemplates();
    function onUpdate(event: Event) {
      const detail = (event as CustomEvent<{ moduleId?: string }>).detail;
      if (detail?.moduleId && detail.moduleId !== moduleId) return;
      refresh();
    }
    function onFocusEdit(event: Event) {
      const detail = (
        event as CustomEvent<{ moduleId?: string; id?: string }>
      ).detail;
      if (detail?.moduleId !== moduleId || !detail.id) return;
      const next = loadMindMaps(moduleId, locale, []);
      setItems(next);
      startEdit(detail.id, next);
    }
    window.addEventListener(MINDMAP_ITEMS_EVENT, onUpdate);
    window.addEventListener(MINDMAP_FOCUS_EDIT_EVENT, onFocusEdit);
    window.addEventListener(MINDMAP_STYLE_LIBRARY_EVENT, refreshStyles);
    window.addEventListener(MINDMAP_LIBRARY_EVENT, refreshTemplates);
    window.addEventListener("storage", onUpdate);
    window.addEventListener("storage", refreshStyles);
    window.addEventListener("storage", refreshTemplates);
    return () => {
      window.removeEventListener(MINDMAP_ITEMS_EVENT, onUpdate);
      window.removeEventListener(MINDMAP_FOCUS_EDIT_EVENT, onFocusEdit);
      window.removeEventListener(MINDMAP_STYLE_LIBRARY_EVENT, refreshStyles);
      window.removeEventListener(MINDMAP_LIBRARY_EVENT, refreshTemplates);
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("storage", refreshStyles);
      window.removeEventListener("storage", refreshTemplates);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, moduleId]);

  function startEdit(mapId: string, list: MindMapDoc[] = items) {
    const doc = list.find((row) => row.id === mapId);
    setEditingId(mapId);
    const root = doc?.nodes.find((node) => node.parentId === null);
    setSelectedNodeId(root?.id ?? null);
    setEditingNodeId(null);
    setEditingTitle(false);
    setLibrarySavedHint(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setSelectedNodeId(null);
    setEditingNodeId(null);
    setEditingTitle(false);
    setPendingRemoveNodeId(null);
    setLibrarySavedHint(false);
    clearBranchPointerState();
  }

  function confirmRemoveMap() {
    if (!pendingRemoveId) return;
    if (editingId === pendingRemoveId) cancelEdit();
    setItems(removeMindMap(moduleId, locale, items, pendingRemoveId));
    setPendingRemoveId(null);
  }

  function handleSaveToLibrary(doc: MindMapDoc) {
    saveMindMapToLibrary(docToMindMapTemplate(doc));
    setTemplateLibrary(loadMindMapLibrary());
    setLibrarySavedHint(true);
    window.setTimeout(() => setLibrarySavedHint(false), 2000);
  }

  function handleSaveStyleToLibrary(doc: MindMapDoc) {
    const style = resolveDocEdgeStyle(doc);
    const pack = stylePackFromEdge(edgeStyleToPayload(style), {
      name:
        style.labelZh ||
        style.labelEn ||
        doc.title.trim() ||
        dict.mindmap.edgeStyle,
    });
    const saved = saveMindMapStyleToLibrary(pack);
    setStyleLibrary(loadMindMapStyleLibrary());
    applyCustomEdgeStyle(doc.id, libraryStyleToPayload(saved));
    setStyleSavedHint(true);
    window.setTimeout(() => setStyleSavedHint(false), 2000);
  }

  function handleReorder(from: number, to: number) {
    setItems(reorderMindMaps(moduleId, locale, items, from, to));
  }

  function patchTitle(mapId: string, title: string) {
    setItems(updateMindMap(moduleId, locale, items, mapId, { title }));
  }

  function patchNodeText(mapId: string, nodeId: string, text: string) {
    const doc = items.find((row) => row.id === mapId);
    if (!doc) return;
    setItems(
      updateMindMap(moduleId, locale, items, mapId, {
        nodes: doc.nodes.map((node) =>
          node.id === nodeId ? { ...node, text } : node,
        ),
      }),
    );
  }

  function patchNodeStyle(
    mapId: string,
    nodeId: string,
    patch: { bg?: string | null; fontId?: string | null },
  ) {
    const doc = items.find((row) => row.id === mapId);
    if (!doc) return;
    if (patch.fontId) void ensureMindMapFontLoaded(patch.fontId);
    setItems(
      updateMindMap(moduleId, locale, items, mapId, {
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          const next = { ...node };
          if (patch.bg !== undefined) {
            if (patch.bg) next.bg = patch.bg;
            else delete next.bg;
          }
          if (patch.fontId !== undefined) {
            if (patch.fontId) next.fontId = patch.fontId;
            else delete next.fontId;
          }
          return next;
        }),
      }),
    );
  }

  function handleAddChild(mapId: string) {
    if (!selectedNodeId) return;
    const { items: next, nodeId } = addMindMapChild(
      moduleId,
      locale,
      items,
      mapId,
      selectedNodeId,
      dict.mindmap.newBranchText,
    );
    setItems(next);
    setSelectedNodeId(nodeId);
    setEditingNodeId(nodeId);
  }

  function handleAddSibling(mapId: string) {
    if (!selectedNodeId) return;
    const doc = items.find((row) => row.id === mapId);
    const selected = doc?.nodes.find((node) => node.id === selectedNodeId);
    if (!selected?.parentId) return;
    const { items: next, nodeId } = addMindMapChild(
      moduleId,
      locale,
      items,
      mapId,
      selected.parentId,
      dict.mindmap.newBranchText,
    );
    setItems(next);
    setSelectedNodeId(nodeId);
    setEditingNodeId(nodeId);
  }

  function confirmRemoveNode() {
    if (!editingId || !pendingRemoveNodeId) return;
    const doc = items.find((row) => row.id === editingId);
    setItems(
      removeMindMapNode(
        moduleId,
        locale,
        items,
        editingId,
        pendingRemoveNodeId,
      ),
    );
    if (selectedNodeId === pendingRemoveNodeId) {
      const root = doc?.nodes.find((node) => node.parentId === null);
      setSelectedNodeId(root?.id ?? null);
    }
    setPendingRemoveNodeId(null);
    setEditingNodeId(null);
  }

  function canDropOn(
    doc: MindMapDoc,
    targetId: string | null,
    sourceId: string | null,
  ) {
    if (!sourceId || !targetId) return false;
    if (sourceId === targetId) return false;
    const source = doc.nodes.find((node) => node.id === sourceId);
    if (!source || source.parentId === null) return false;
    let cursor: string | null = targetId;
    const byId = new Map(doc.nodes.map((node) => [node.id, node]));
    while (cursor) {
      if (cursor === sourceId) return false;
      cursor = byId.get(cursor)?.parentId ?? null;
    }
    return Boolean(byId.get(targetId));
  }

  function siblingBeforeId(
    laidOut: LaidOutNode[],
    doc: MindMapDoc,
    sourceId: string,
    parentId: string,
    dropY: number,
  ): string | null {
    const siblings = laidOut
      .filter(
        (node) => node.parentId === parentId && node.id !== sourceId,
      )
      .sort((a, b) => a.y - b.y);
    for (const sibling of siblings) {
      if (dropY < sibling.y + NODE_H / 2) return sibling.id;
    }
    return null;
  }

  function beginBranchDrag(
    nodeId: string,
    pos: { x: number; y: number },
    svg: SVGSVGElement,
    pointerId: number,
  ) {
    pendingDragRef.current = null;
    dragNodeIdRef.current = nodeId;
    dragPosRef.current = pos;
    dragOriginRef.current = pos;
    setDragNodeId(nodeId);
    setDragPos(pos);
    setSelectedNodeId(nodeId);
    dropTargetIdRef.current = null;
    setDropTargetId(null);
    suppressClickRef.current = true;
    try {
      svg.setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }
  }

  function clearBranchPointerState() {
    pendingDragRef.current = null;
    dragNodeIdRef.current = null;
    dropTargetIdRef.current = null;
    dragPosRef.current = null;
    dragOriginRef.current = null;
    setDragNodeId(null);
    setDropTargetId(null);
    setDragPos(null);
  }

  function finishBranchDrag(
    doc: MindMapDoc,
    laidOut: LaidOutNode[],
    bounds: { minY: number },
  ) {
    const sourceId = dragNodeIdRef.current;
    const targetId = dropTargetIdRef.current;
    const pos = dragPosRef.current;
    const origin = dragOriginRef.current;
    const wasDragging = Boolean(sourceId);
    clearBranchPointerState();
    if (!wasDragging || !sourceId || !pos) return;

    const source = doc.nodes.find((node) => node.id === sourceId);
    const laid = laidOut.find((node) => node.id === sourceId);
    if (!source || !laid || source.parentId === null) return;

    if (
      origin &&
      Math.hypot(pos.x - origin.x, pos.y - origin.y) < DRAG_THRESHOLD_PX &&
      !targetId
    ) {
      return;
    }

    if (targetId && canDropOn(doc, targetId, sourceId)) {
      setItems(
        relocateMindMapNode(moduleId, locale, items, doc.id, sourceId, {
          parentId: targetId,
          ox: 0,
          oy: 0,
          beforeId: null,
        }),
      );
      setSelectedNodeId(sourceId);
      return;
    }

    const layoutX = pos.x - PAD;
    const layoutY = pos.y - PAD + bounds.minY;
    const ox = layoutX - laid.baseX;
    const oy = layoutY - laid.baseY;
    const beforeId = siblingBeforeId(
      laidOut,
      doc,
      sourceId,
      source.parentId,
      layoutY,
    );
    setItems(
      relocateMindMapNode(moduleId, locale, items, doc.id, sourceId, {
        ox,
        oy,
        beforeId,
      }),
    );
    setSelectedNodeId(sourceId);
  }

  function applyTemplate(template: MindMapTemplate) {
    if (!editingId) return;
    const nodes = expandTemplateTree(template.root);
    const next = updateMindMap(moduleId, locale, items, editingId, {
      title: template.title || template.name,
      nodes,
    });
    setItems(next);
    const doc = next.find((row) => row.id === editingId);
    const root = doc?.nodes.find((node) => node.parentId === null);
    setSelectedNodeId(root?.id ?? null);
    setEditingNodeId(null);
    setEditingTitle(false);
    setBoardImportError(null);
  }

  function patchBuiltinEdgeStyle(mapId: string, edgeStyleId: string) {
    setItems(
      updateMindMap(moduleId, locale, items, mapId, {
        edgeStyleId,
        customEdgeStyle: null,
      }),
    );
  }

  function applyCustomEdgeStyle(
    mapId: string,
    payload: MindMapEdgeStylePayload,
  ) {
    setItems(
      updateMindMap(moduleId, locale, items, mapId, {
        customEdgeStyle: payload,
        edgeStyleId: null,
      }),
    );
  }

  async function handleStyleImport(file: File | null, mapId: string) {
    if (!file) return;
    setStyleImportError(null);
    try {
      const pack = await readMindMapStylePackFile(file);
      const saved = saveMindMapStyleToLibrary(pack);
      setStyleLibrary(loadMindMapStyleLibrary());
      applyCustomEdgeStyle(mapId, libraryStyleToPayload(saved));
    } catch {
      setStyleImportError(dict.mindmap.styleImportError);
    } finally {
      if (styleImportRef.current) styleImportRef.current.value = "";
    }
  }

  async function handleBoardImport(file: File | null) {
    if (!file || !editingId) return;
    setBoardImportError(null);
    try {
      const template = await readMindMapImportFile(file);
      saveMindMapToLibrary(template);
      setTemplateLibrary(loadMindMapLibrary());
      applyTemplate(template);
    } catch {
      setBoardImportError(dict.mindmap.templateImportError);
    } finally {
      if (boardImportRef.current) boardImportRef.current.value = "";
    }
  }

  if (!ready) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
        <div className="h-40 rounded-lg border border-border bg-surface/40" />
        <div className="h-40 rounded-lg border border-border bg-surface/40" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <SortableList count={items.length} onReorder={handleReorder}>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((doc, index) => {
            const editing = editingId === doc.id;
            const root = doc.nodes.find((node) => node.parentId === null);
            const laidOut = editing ? layoutMindMap(doc.nodes) : [];
            const minY =
              laidOut.length > 0
                ? Math.min(...laidOut.map((n) => n.y))
                : 0;
            const maxY =
              laidOut.length > 0
                ? Math.max(...laidOut.map((n) => n.y))
                : 0;
            const maxX =
              laidOut.length > 0
                ? Math.max(...laidOut.map((n) => n.x))
                : 0;
            const bounds = {
              width: maxX + NODE_W + PAD * 2,
              height: maxY - minY + NODE_H + PAD * 2,
              minY,
            };
            const selected = doc.nodes.find(
              (node) => node.id === selectedNodeId,
            );
            const canDeleteNode = Boolean(
              selected && selected.parentId !== null,
            );
            const canAddSibling = Boolean(selected?.parentId);

            return (
              <SortableItem
                key={doc.id}
                index={index}
                className={`group/item rounded-lg border border-border bg-surface/50 p-5 transition-colors hover:border-accent/20 ${
                  editing ? "sm:col-span-2" : ""
                }`}
              >
                <div className="mb-3 flex items-start gap-2">
                  {!editing ? (
                    <h3 className="min-w-0 flex-1 text-lg font-medium tracking-tight text-foreground">
                      {doc.title.trim() || dict.mindmap.newMapTitle}
                    </h3>
                  ) : (
                    <div className="min-w-0 flex-1" />
                  )}
                  <div className="flex shrink-0 items-center gap-1">
                    <DragHandle index={index} label={dict.common.reorder} />
                    {editing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setLibraryOpen(true)}
                          className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-white/45 transition-colors hover:bg-white/10 hover:text-white/80"
                        >
                          {dict.mindmap.myLibrary}
                        </button>
                        <button
                          type="button"
                          onClick={() => setTemplateOpen(true)}
                          className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-white/45 transition-colors hover:bg-white/10 hover:text-white/80"
                        >
                          {dict.mindmap.fromTemplate}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveToLibrary(doc)}
                          className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-white/45 transition-colors hover:bg-white/10 hover:text-white/80"
                        >
                          {dict.mindmap.saveToLibrary}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            exportMindMapTemplateFile(
                              docToMindMapTemplate(doc),
                            )
                          }
                          className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-white/45 transition-colors hover:bg-white/10 hover:text-white/80"
                        >
                          {dict.mindmap.exportTemplate}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-white/55 transition-colors hover:bg-white/10 hover:text-white/85"
                        >
                          {dict.common.done}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-white/35 transition-colors hover:bg-white/10 hover:text-white/70"
                        >
                          {dict.common.cancel}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(doc.id)}
                        title={dict.home.noteEdit}
                        className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-transparent transition-colors group-hover/item:text-muted/60 hover:!text-foreground/80 focus-visible:text-foreground/80"
                      >
                        {dict.home.noteEdit}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingRemoveId(doc.id)}
                      className="cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                      aria-label={dict.mindmap.removeMap}
                      title={dict.mindmap.removeMap}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {editing ? (
                  <div className="space-y-3">
                    {editingTitle ? (
                      <input
                        autoFocus
                        value={doc.title}
                        onChange={(event) =>
                          patchTitle(doc.id, event.target.value)
                        }
                        onBlur={() => setEditingTitle(false)}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" ||
                            event.key === "Escape"
                          ) {
                            setEditingTitle(false);
                          }
                        }}
                        placeholder={dict.mindmap.titlePlaceholder}
                        className="w-full bg-transparent text-lg font-medium text-foreground outline-none placeholder:text-muted/40"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingTitle(true)}
                        title={dict.home.noteEdit}
                        className="w-full cursor-pointer text-left text-lg font-medium tracking-tight text-foreground transition-colors hover:text-accent"
                      >
                        {doc.title.trim() || dict.mindmap.titlePlaceholder}
                      </button>
                    )}

                    {librarySavedHint ? (
                      <p className="text-[11px] text-accent/90">
                        {dict.mindmap.savedToLibrary}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddChild(doc.id)}
                        disabled={!selectedNodeId}
                        className="cursor-pointer rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/75 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        + {dict.mindmap.addChild}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddSibling(doc.id)}
                        disabled={!canAddSibling}
                        className="cursor-pointer rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/75 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        + {dict.mindmap.addSibling}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          selectedNodeId &&
                          setPendingRemoveNodeId(selectedNodeId)
                        }
                        disabled={!canDeleteNode}
                        className="cursor-pointer rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-white/55 transition-colors hover:bg-white/10 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {dict.mindmap.deleteNode}
                      </button>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
                      <button
                        type="button"
                        onClick={() =>
                          setBoardLibraryExpanded((open) => !open)
                        }
                        aria-expanded={boardLibraryExpanded}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
                      >
                        <span
                          className={`text-[10px] text-white/45 transition-transform ${
                            boardLibraryExpanded ? "rotate-90" : ""
                          }`}
                          aria-hidden
                        >
                          ▸
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-medium tracking-wide text-white/55">
                            {dict.mindmap.boardTemplateLibrary}
                          </span>
                          {!boardLibraryExpanded ? (
                            <span className="mt-0.5 block text-[10px] text-white/30">
                              {dict.mindmap.boardTemplateLibraryHint}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-[10px] text-white/40">
                          {boardLibraryExpanded
                            ? dict.mindmap.collapseBoardLibrary
                            : dict.mindmap.expandBoardLibrary}
                        </span>
                      </button>

                      {boardLibraryExpanded ? (
                        <div className="space-y-3 border-t border-white/10 px-3 py-3">
                          <p className="text-[11px] text-white/35">
                            {dict.mindmap.boardTemplateLibraryHint}
                          </p>

                          <div>
                            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[11px] text-white/40">
                                  {dict.mindmap.edgeStyle}
                                </p>
                                <p className="mt-0.5 text-[10px] text-white/30">
                                  {dict.mindmap.edgeStyleHint}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSaveStyleToLibrary(doc)
                                  }
                                  className="cursor-pointer rounded border border-white/15 px-2 py-0.5 text-[10px] text-white/55 transition-colors hover:bg-white/10 hover:text-white/80"
                                >
                                  {dict.mindmap.saveStyleToLibrary}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    styleImportRef.current?.click()
                                  }
                                  className="cursor-pointer rounded border border-white/15 px-2 py-0.5 text-[10px] text-white/55 transition-colors hover:bg-white/10 hover:text-white/80"
                                >
                                  {dict.mindmap.importStyle}
                                </button>
                                <input
                                  ref={styleImportRef}
                                  type="file"
                                  accept=".json,application/json"
                                  className="hidden"
                                  onChange={(event) =>
                                    void handleStyleImport(
                                      event.target.files?.[0] ?? null,
                                      doc.id,
                                    )
                                  }
                                />
                              </div>
                            </div>
                            {styleSavedHint ? (
                              <p className="mb-1.5 text-[11px] text-accent/90">
                                {dict.mindmap.savedStyleToLibrary}
                              </p>
                            ) : null}
                            {styleImportError ? (
                              <p className="mb-1.5 text-[11px] text-red-300/90">
                                {styleImportError}
                              </p>
                            ) : null}
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                              {MINDMAP_EDGE_STYLE_TEMPLATES.map((style) => {
                                const active =
                                  !doc.customEdgeStyle &&
                                  (doc.edgeStyleId ?? "curve-soft") ===
                                    style.id;
                                const label =
                                  locale === "zh"
                                    ? style.labelZh
                                    : style.labelEn;
                                return (
                                  <button
                                    key={style.id}
                                    type="button"
                                    title={
                                      locale === "zh"
                                        ? style.descriptionZh
                                        : style.descriptionEn
                                    }
                                    onClick={() =>
                                      patchBuiltinEdgeStyle(doc.id, style.id)
                                    }
                                    className={`flex cursor-pointer flex-col items-stretch gap-1 rounded-md border px-2 py-1.5 text-left transition-colors ${
                                      active
                                        ? "border-white/45 bg-white/10"
                                        : "border-white/10 bg-black/20 hover:border-white/25 hover:bg-white/[0.06]"
                                    }`}
                                  >
                                    <EdgeStylePreview style={style} />
                                    <span className="truncate text-[10px] text-white/70">
                                      {label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {styleLibrary.length > 0 ? (
                              <div className="mt-2.5">
                                <p className="mb-1.5 text-[11px] text-white/40">
                                  {dict.mindmap.importedStyles}
                                </p>
                                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                                  {styleLibrary.map((item) => {
                                    const style = payloadToEdgeStyle(
                                      libraryStyleToPayload(item),
                                    );
                                    const active =
                                      doc.customEdgeStyle?.libraryId ===
                                      item.id;
                                    return (
                                      <div
                                        key={item.id}
                                        className={`relative rounded-md border ${
                                          active
                                            ? "border-white/45 bg-white/10"
                                            : "border-white/10 bg-black/20"
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          title={item.description || item.name}
                                          onClick={() =>
                                            applyCustomEdgeStyle(
                                              doc.id,
                                              libraryStyleToPayload(item),
                                            )
                                          }
                                          className="flex w-full cursor-pointer flex-col items-stretch gap-1 px-2 py-1.5 pr-7 text-left transition-colors hover:bg-white/[0.06]"
                                        >
                                          <EdgeStylePreview style={style} />
                                          <span className="truncate text-[10px] text-white/70">
                                            {item.name}
                                          </span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            setPendingRemoveStyleId(item.id);
                                          }}
                                          className="absolute right-0.5 top-0.5 cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                                          aria-label={
                                            dict.mindmap.removeImportedStyle
                                          }
                                          title={
                                            dict.mindmap.removeImportedStyle
                                          }
                                        >
                                          ×
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div>
                            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[11px] text-white/40">
                                {dict.mindmap.freeTemplates}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveToLibrary(doc)}
                                  className="cursor-pointer rounded border border-white/15 px-2 py-0.5 text-[10px] text-white/55 transition-colors hover:bg-white/10 hover:text-white/80"
                                >
                                  {dict.mindmap.addTemplateToLibrary}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    boardImportRef.current?.click()
                                  }
                                  className="cursor-pointer rounded border border-white/15 px-2 py-0.5 text-[10px] text-white/55 transition-colors hover:bg-white/10 hover:text-white/80"
                                >
                                  {dict.mindmap.importTemplate}
                                </button>
                              </div>
                              <input
                                ref={boardImportRef}
                                type="file"
                                accept=".json,.md,.markdown,.txt,application/json,text/markdown,text/plain"
                                className="hidden"
                                onChange={(event) =>
                                  void handleBoardImport(
                                    event.target.files?.[0] ?? null,
                                  )
                                }
                              />
                            </div>
                            {boardImportError ? (
                              <p className="mb-1.5 text-[11px] text-red-300/90">
                                {boardImportError}
                              </p>
                            ) : null}
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {BUILTIN_MINDMAP_TEMPLATES.map((builtin) => {
                                const name =
                                  locale === "zh"
                                    ? builtin.nameZh
                                    : builtin.nameEn;
                                const description =
                                  locale === "zh"
                                    ? builtin.descriptionZh
                                    : builtin.descriptionEn;
                                return (
                                  <button
                                    key={builtin.id}
                                    type="button"
                                    onClick={() =>
                                      applyTemplate(
                                        builtinToMindMapTemplate(
                                          builtin,
                                          locale,
                                        ),
                                      )
                                    }
                                    className="cursor-pointer rounded-md border border-white/10 bg-black/20 px-2.5 py-2 text-left transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                                  >
                                    <span className="block text-[11px] text-white/85">
                                      {name}
                                    </span>
                                    <span className="mt-0.5 block text-[10px] text-white/40">
                                      {description}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {templateLibrary.length > 0 ? (
                              <div className="mt-2.5">
                                <p className="mb-1.5 text-[11px] text-white/40">
                                  {dict.mindmap.myTemplates}
                                </p>
                                <div className="grid gap-1.5 sm:grid-cols-2">
                                  {templateLibrary.map((item) => (
                                    <div
                                      key={item.id}
                                      className="relative rounded-md border border-white/10 bg-black/20"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          applyTemplate(
                                            libraryItemToMindMapTemplate(item),
                                          )
                                        }
                                        className="w-full cursor-pointer px-2.5 py-2 pr-7 text-left transition-colors hover:bg-white/[0.06]"
                                      >
                                        <span className="block text-[11px] text-white/85">
                                          {item.name}
                                        </span>
                                        <span className="mt-0.5 block text-[10px] text-white/40">
                                          {item.description || item.title}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          setPendingRemoveTemplateId(item.id);
                                        }}
                                        className="absolute right-0.5 top-0.5 cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                                        aria-label={
                                          dict.mindmap.removeFromLibrary
                                        }
                                        title={dict.mindmap.removeFromLibrary}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {selectedNodeId ? (
                      <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                        <div>
                          <p className="mb-1.5 text-[11px] text-white/40">
                            {dict.mindmap.nodeFill}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {MINDMAP_NODE_COLORS.map((color) => {
                              const selectedNode = doc.nodes.find(
                                (node) => node.id === selectedNodeId,
                              );
                              const currentBg =
                                selectedNode?.bg || DEFAULT_MINDMAP_NODE_BG;
                              const active = currentBg === color.hex;
                              return (
                                <button
                                  key={color.id}
                                  type="button"
                                  title={
                                    locale === "zh"
                                      ? color.labelZh
                                      : color.labelEn
                                  }
                                  onClick={() =>
                                    patchNodeStyle(doc.id, selectedNodeId, {
                                      bg:
                                        color.hex === DEFAULT_MINDMAP_NODE_BG
                                          ? null
                                          : color.hex,
                                    })
                                  }
                                  className={`h-6 w-6 cursor-pointer rounded-full border transition-transform hover:scale-110 ${
                                    active
                                      ? "border-white ring-1 ring-white/70"
                                      : "border-white/25"
                                  }`}
                                  style={{ background: color.hex }}
                                  aria-label={
                                    locale === "zh"
                                      ? color.labelZh
                                      : color.labelEn
                                  }
                                />
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <p className="mb-1.5 text-[11px] text-white/40">
                            {dict.mindmap.nodeFont}
                          </p>
                          <select
                            value={
                              doc.nodes.find(
                                (node) => node.id === selectedNodeId,
                              )?.fontId ?? "system-sans"
                            }
                            onChange={(event) =>
                              patchNodeStyle(doc.id, selectedNodeId, {
                                fontId: event.target.value,
                              })
                            }
                            className="w-full cursor-pointer rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-[11px] text-white/80 outline-none"
                          >
                            {mindMapFontOptions().map((font) => (
                              <option key={font.id} value={font.id}>
                                {locale === "zh"
                                  ? font.labelZh
                                  : font.labelEn}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-white/30">
                        {dict.mindmap.selectNodeForStyle}
                      </p>
                    )}

                    <div
                      className="overflow-auto rounded-xl border border-white/10"
                      style={{
                        background:
                          "radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.04), transparent 50%), linear-gradient(160deg, rgba(12,16,22,0.9), rgba(8,10,14,0.95))",
                      }}
                    >
                      <MindMapCanvas
                        doc={doc}
                        laidOut={laidOut}
                        bounds={bounds}
                        accentColor={accentColor}
                        selectedNodeId={selectedNodeId}
                        editingNodeId={editingNodeId}
                        dragNodeId={dragNodeId}
                        dropTargetId={dropTargetId}
                        dragPos={dragPos}
                        dict={dict}
                        onSelect={(nodeId) => {
                          if (suppressClickRef.current) {
                            suppressClickRef.current = false;
                            return;
                          }
                          setSelectedNodeId(nodeId);
                          setEditingNodeId(null);
                        }}
                        onEditText={(nodeId) => {
                          setSelectedNodeId(nodeId);
                          setEditingNodeId(nodeId);
                        }}
                        onPatchText={(nodeId, text) =>
                          patchNodeText(doc.id, nodeId, text)
                        }
                        onEndEditText={() => setEditingNodeId(null)}
                        onNodePointerDown={(nodeId, event, mode) => {
                          if (editingNodeId || editingTitle) return;
                          const node = doc.nodes.find(
                            (row) => row.id === nodeId,
                          );
                          if (!node) return;

                          if (node.parentId === null) {
                            setSelectedNodeId(nodeId);
                            return;
                          }

                          const svg = (
                            event.currentTarget as SVGElement
                          ).ownerSVGElement;
                          if (!svg) return;
                          const rect = svg.getBoundingClientRect();
                          const x = event.clientX - rect.left - NODE_W / 2;
                          const y = event.clientY - rect.top - NODE_H / 2;

                          if (mode === "handle") {
                            event.preventDefault();
                            beginBranchDrag(
                              nodeId,
                              { x, y },
                              svg,
                              event.pointerId,
                            );
                            return;
                          }

                          // Body press: select immediately; drag only after threshold.
                          setSelectedNodeId(nodeId);
                          setEditingNodeId(null);
                          suppressClickRef.current = false;
                          pendingDragRef.current = {
                            nodeId,
                            clientX: event.clientX,
                            clientY: event.clientY,
                            x,
                            y,
                          };
                        }}
                        onCanvasPointerMove={(event) => {
                          const pending = pendingDragRef.current;
                          if (pending && !dragNodeIdRef.current) {
                            const dist = Math.hypot(
                              event.clientX - pending.clientX,
                              event.clientY - pending.clientY,
                            );
                            if (dist < DRAG_THRESHOLD_PX) return;
                            const rect = event.currentTarget.getBoundingClientRect();
                            beginBranchDrag(
                              pending.nodeId,
                              {
                                x: event.clientX - rect.left - NODE_W / 2,
                                y: event.clientY - rect.top - NODE_H / 2,
                              },
                              event.currentTarget,
                              event.pointerId,
                            );
                          }

                          if (!dragNodeIdRef.current) return;
                          const svg = event.currentTarget;
                          const rect = svg.getBoundingClientRect();
                          const x = event.clientX - rect.left - NODE_W / 2;
                          const y = event.clientY - rect.top - NODE_H / 2;
                          dragPosRef.current = { x, y };
                          setDragPos({ x, y });
                          const cx = event.clientX - rect.left;
                          const cy = event.clientY - rect.top;
                          let hit: string | null = null;
                          for (const node of laidOut) {
                            if (node.id === dragNodeIdRef.current) continue;
                            const nx = PAD + node.x;
                            const ny = PAD + (node.y - bounds.minY);
                            if (
                              cx >= nx &&
                              cx <= nx + NODE_W &&
                              cy >= ny &&
                              cy <= ny + NODE_H
                            ) {
                              hit = node.id;
                              break;
                            }
                          }
                          const next =
                            hit &&
                            canDropOn(doc, hit, dragNodeIdRef.current)
                              ? hit
                              : null;
                          dropTargetIdRef.current = next;
                          setDropTargetId(next);
                          suppressClickRef.current = true;
                        }}
                        onCanvasPointerUp={() => {
                          if (pendingDragRef.current && !dragNodeIdRef.current) {
                            pendingDragRef.current = null;
                            return;
                          }
                          finishBranchDrag(doc, laidOut, bounds);
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-white/30">
                      {dict.mindmap.editHint}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted">
                    {root?.text.trim() || dict.mindmap.newRootText}
                    <span className="ml-2 text-xs text-white/25">
                      · {doc.nodes.length} {dict.mindmap.nodesLabel}
                    </span>
                  </p>
                )}
              </SortableItem>
            );
          })}
        </div>
      </SortableList>

      <ConfirmDialog
        open={pendingRemoveId !== null}
        message={dict.mindmap.removeMapConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={confirmRemoveMap}
        onCancel={() => setPendingRemoveId(null)}
      />
      <ConfirmDialog
        open={pendingRemoveNodeId !== null}
        message={dict.mindmap.deleteNodeConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={confirmRemoveNode}
        onCancel={() => setPendingRemoveNodeId(null)}
      />
      <ConfirmDialog
        open={pendingRemoveStyleId !== null}
        message={dict.mindmap.removeImportedStyleConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        danger
        onConfirm={() => {
          if (pendingRemoveStyleId) {
            removeMindMapStyleFromLibrary(pendingRemoveStyleId);
            setStyleLibrary(loadMindMapStyleLibrary());
          }
          setPendingRemoveStyleId(null);
        }}
        onCancel={() => setPendingRemoveStyleId(null)}
      />
      <ConfirmDialog
        open={pendingRemoveTemplateId !== null}
        message={dict.mindmap.removeFromLibraryConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        danger
        onConfirm={() => {
          if (pendingRemoveTemplateId) {
            removeMindMapLibraryTemplate(pendingRemoveTemplateId);
            setTemplateLibrary(loadMindMapLibrary());
          }
          setPendingRemoveTemplateId(null);
        }}
        onCancel={() => setPendingRemoveTemplateId(null)}
      />
      <MindMapTemplateDialog
        locale={locale}
        dict={dict}
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onApply={applyTemplate}
      />
      <MindMapLibraryDialog
        locale={locale}
        dict={dict}
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onApply={applyTemplate}
      />
    </div>
  );
}

function EdgeStylePreview({ style }: { style: MindMapEdgeStyle }) {
  const d = mindMapEdgePathD(style.path, 4, 10, 52, 10);
  const markerId = `preview-arrow-${style.id}`;
  return (
    <svg viewBox="0 0 56 20" className="h-5 w-full" aria-hidden>
      {style.arrow ? (
        <defs>
          <marker
            id={markerId}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill={style.color} />
          </marker>
        </defs>
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={style.color}
        strokeWidth={style.width}
        strokeDasharray={style.dasharray}
        markerEnd={style.arrow ? `url(#${markerId})` : undefined}
      />
    </svg>
  );
}

function MindMapCanvas({
  doc,
  laidOut,
  bounds,
  accentColor,
  selectedNodeId,
  editingNodeId,
  dragNodeId,
  dropTargetId,
  dragPos,
  dict,
  onSelect,
  onEditText,
  onPatchText,
  onEndEditText,
  onNodePointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
}: {
  doc: MindMapDoc;
  laidOut: LaidOutNode[];
  bounds: { width: number; height: number; minY: number };
  accentColor: string;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  dragNodeId: string | null;
  dropTargetId: string | null;
  dragPos: { x: number; y: number } | null;
  dict: Dictionary;
  onSelect: (nodeId: string) => void;
  onEditText: (nodeId: string) => void;
  onPatchText: (nodeId: string, text: string) => void;
  onEndEditText: () => void;
  onNodePointerDown: (
    nodeId: string,
    event: ReactPointerEvent,
    mode: "body" | "handle",
  ) => void;
  onCanvasPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onCanvasPointerUp: () => void;
}) {
  useEffect(() => {
    for (const node of doc.nodes) {
      if (node.fontId) void ensureMindMapFontLoaded(node.fontId);
    }
  }, [doc.nodes]);

  const edgeStyle = resolveDocEdgeStyle(doc);
  const markerId = `mm-arrow-${doc.id}`;
  const dragNode = laidOut.find((node) => node.id === dragNodeId);
  const width = Math.max(
    bounds.width,
    dragPos ? dragPos.x + NODE_W + PAD : 0,
    480,
  );
  const height = Math.max(
    bounds.height,
    dragPos ? dragPos.y + NODE_H + PAD : 0,
    240,
  );

  return (
    <svg
      width={width}
      height={height}
      className="block min-w-full touch-none"
      role="img"
      aria-label={doc.title || dict.mindmap.title}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onPointerLeave={(event) => {
        // Only end an active drag when the pointer truly leaves the svg
        // with capture released; pending body-press should just cancel.
        if (dragNodeId && event.buttons === 0) onCanvasPointerUp();
      }}
      onPointerCancel={onCanvasPointerUp}
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill={edgeStyle.color} />
        </marker>
      </defs>

      {laidOut.map((node) => {
        if (!node.parentId || node.id === dragNodeId) return null;
        const parent = laidOut.find((row) => row.id === node.parentId);
        if (!parent) return null;
        const parentDragging = parent.id === dragNodeId && dragPos;
        const x1 = parentDragging
          ? dragPos.x + NODE_W
          : PAD + parent.x + NODE_W;
        const y1 = parentDragging
          ? dragPos.y + NODE_H / 2
          : PAD + (parent.y - bounds.minY) + NODE_H / 2;
        const x2 = PAD + node.x;
        const y2 = PAD + (node.y - bounds.minY) + NODE_H / 2;
        return (
          <path
            key={`edge-${node.id}`}
            d={mindMapEdgePathD(edgeStyle.path, x1, y1, x2, y2)}
            fill="none"
            stroke={edgeStyle.color}
            strokeWidth={edgeStyle.width}
            strokeDasharray={edgeStyle.dasharray}
            markerEnd={edgeStyle.arrow ? `url(#${markerId})` : undefined}
          />
        );
      })}

      {laidOut.map((node) => {
        const dragging = node.id === dragNodeId;
        const x = dragging && dragPos ? dragPos.x : PAD + node.x;
        const y =
          dragging && dragPos ? dragPos.y : PAD + (node.y - bounds.minY);
        const selectedHere = node.id === selectedNodeId;
        const editingHere = node.id === editingNodeId;
        const dropHere = node.id === dropTargetId;
        const fill = node.bg || DEFAULT_MINDMAP_NODE_BG;
        const textColor = contrastTextColor(fill);
        const handleDot = contrastTextColor(fill).includes("255")
          ? "rgba(255,255,255,0.45)"
          : "rgba(20,24,30,0.4)";
        const fontFamily = resolveMindMapFontStack(node.fontId);
        const isBranch = node.parentId !== null;
        const textLeft = isBranch ? DRAG_HANDLE_W + 2 : 6;
        const textWidth = NODE_W - textLeft - 6;
        return (
          <g
            key={node.id}
            transform={`translate(${x}, ${y})`}
            opacity={dragging ? 0.92 : 1}
          >
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill={fill}
              stroke={
                dropHere
                  ? accentColor
                  : selectedHere || dragging
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(255,255,255,0.22)"
              }
              strokeWidth={dropHere || selectedHere || dragging ? 1.75 : 1}
              className="cursor-pointer"
              onPointerDown={(event) =>
                onNodePointerDown(node.id, event, "body")
              }
              onClick={() => onSelect(node.id)}
              onDoubleClick={() => onEditText(node.id)}
            />
            {isBranch ? (
              <g
                className="cursor-grab"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onNodePointerDown(node.id, event, "handle");
                }}
              >
                <title>{dict.mindmap.dragHandle}</title>
                <rect
                  x={1}
                  y={1}
                  width={DRAG_HANDLE_W}
                  height={NODE_H - 2}
                  rx={7}
                  fill={
                    selectedHere || dragging
                      ? "rgba(0,0,0,0.06)"
                      : "rgba(0,0,0,0.03)"
                  }
                />
                {[12, 18, 24].map((cy) => (
                  <g key={cy}>
                    <circle cx={5.5} cy={cy} r={1.15} fill={handleDot} />
                    <circle cx={10.5} cy={cy} r={1.15} fill={handleDot} />
                  </g>
                ))}
              </g>
            ) : null}
            {editingHere ? (
              <foreignObject
                x={textLeft}
                y={6}
                width={textWidth}
                height={24}
              >
                <input
                  autoFocus
                  value={node.text}
                  onChange={(event) =>
                    onPatchText(node.id, event.target.value)
                  }
                  onBlur={onEndEditText}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === "Escape") {
                      onEndEditText();
                    }
                  }}
                  className="h-6 w-full bg-transparent text-center text-[11px] outline-none"
                  style={{
                    color: textColor,
                    fontFamily,
                  }}
                />
              </foreignObject>
            ) : (
              <text
                x={(textLeft + NODE_W - 6) / 2}
                y={NODE_H / 2 + 4}
                textAnchor="middle"
                className="pointer-events-none select-none"
                fill={textColor}
                fontSize={11}
                style={{ fontFamily }}
              >
                {(node.text.trim() || dict.mindmap.nodePlaceholder).slice(
                  0,
                  isBranch ? 14 : 16,
                )}
              </text>
            )}
          </g>
        );
      })}

      {dragNode &&
      dragPos &&
      dragNode.parentId &&
      (() => {
        const parent = laidOut.find((row) => row.id === dragNode.parentId);
        if (!parent || parent.id === dragNodeId) return null;
        const x1 = PAD + parent.x + NODE_W;
        const y1 = PAD + (parent.y - bounds.minY) + NODE_H / 2;
        const x2 = dragPos.x;
        const y2 = dragPos.y + NODE_H / 2;
        return (
          <path
            key="drag-edge"
            d={mindMapEdgePathD(edgeStyle.path, x1, y1, x2, y2)}
            fill="none"
            stroke={dropTargetId ? accentColor : edgeStyle.color}
            strokeWidth={edgeStyle.width}
            strokeDasharray={edgeStyle.dasharray ?? "4 3"}
            markerEnd={edgeStyle.arrow ? `url(#${markerId})` : undefined}
          />
        );
      })()}
    </svg>
  );
}
