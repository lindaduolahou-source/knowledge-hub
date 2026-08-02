import type { Locale } from "@/i18n/config";
import { moveIndex } from "@/lib/reorder";
import {
  normalizeCustomEdgeStyle,
  type MindMapEdgeStylePayload,
} from "@/lib/mindmap-style";
import { pushMindMapToTrash } from "@/lib/trash";
import {
  rememberTocPhrase,
  translateTocNote,
} from "@/lib/translate-note";

const STORAGE_KEY = "knowledge-hub:mindmap-items";
export const MINDMAP_ITEMS_EVENT = "knowledge-hub:mindmap-items-updated";
export const MINDMAP_FOCUS_EDIT_EVENT = "knowledge-hub:mindmap-focus-edit";

export type MindMapNode = {
  id: string;
  text: string;
  parentId: string | null;
  /** Manual offset from auto-layout (branch drag). */
  ox?: number;
  oy?: number;
  /** Node fill color (#RRGGBB). */
  bg?: string;
  /** Font id from mindmap-style / share-card fonts. */
  fontId?: string;
};

export type MindMapDoc = {
  id: string;
  title: string;
  nodes: MindMapNode[];
  /** Connector style id from free edge template library. */
  edgeStyleId?: string;
  /** Imported / custom connector style (takes precedence over edgeStyleId). */
  customEdgeStyle?: MindMapEdgeStylePayload;
};

/** Per-module mind map lists. */
type MindMapStore = Record<string, Partial<Record<Locale, MindMapDoc[]>>>;

export function requestMindMapEdit(moduleId: string, id: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MINDMAP_FOCUS_EDIT_EVENT, {
      detail: { moduleId, id },
    }),
  );
}

function otherLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}

function emit(moduleId: string, locale?: Locale) {
  window.dispatchEvent(
    new CustomEvent(MINDMAP_ITEMS_EVENT, {
      detail: { moduleId, locale },
    }),
  );
}

function isLocaleBucket(
  value: unknown,
): value is Partial<Record<Locale, MindMapDoc[]>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.every((key) => key === "zh" || key === "en");
}

function loadStore(): MindMapStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MindMapStore;
    if (!parsed || typeof parsed !== "object") return {};
    const next: MindMapStore = {};
    for (const [moduleId, bucket] of Object.entries(parsed)) {
      if (isLocaleBucket(bucket)) next[moduleId] = bucket;
    }
    return next;
  } catch {
    return {};
  }
}

function writeStore(store: MindMapStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function normalizeNode(value: unknown): MindMapNode | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<MindMapNode>;
  if (typeof row.id !== "string" || !row.id) return null;
  const ox = typeof row.ox === "number" && Number.isFinite(row.ox) ? row.ox : 0;
  const oy = typeof row.oy === "number" && Number.isFinite(row.oy) ? row.oy : 0;
  const bg =
    typeof row.bg === "string" && /^#[0-9a-fA-F]{6}$/.test(row.bg.trim())
      ? row.bg.trim()
      : undefined;
  const fontId =
    typeof row.fontId === "string" && row.fontId.trim()
      ? row.fontId.trim()
      : undefined;
  return {
    id: row.id,
    text: typeof row.text === "string" ? row.text : "",
    parentId:
      typeof row.parentId === "string"
        ? row.parentId
        : row.parentId === null
          ? null
          : null,
    ...(ox !== 0 ? { ox } : {}),
    ...(oy !== 0 ? { oy } : {}),
    ...(bg ? { bg } : {}),
    ...(fontId ? { fontId } : {}),
  };
}

function ensureRoot(nodes: MindMapNode[]): MindMapNode[] {
  if (nodes.some((node) => node.parentId === null)) return nodes;
  if (nodes.length === 0) {
    return [{ id: `node-${Date.now().toString(36)}`, text: "", parentId: null }];
  }
  return nodes.map((node, index) =>
    index === 0 ? { ...node, parentId: null } : node,
  );
}

function normalizeDoc(value: unknown): MindMapDoc | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<MindMapDoc>;
  if (typeof row.id !== "string" || !row.id) return null;
  const nodes = Array.isArray(row.nodes)
    ? row.nodes
        .map(normalizeNode)
        .filter((node): node is MindMapNode => Boolean(node))
    : [];
  const edgeStyleId =
    typeof row.edgeStyleId === "string" && row.edgeStyleId.trim()
      ? row.edgeStyleId.trim()
      : undefined;
  const customEdgeStyle = normalizeCustomEdgeStyle(row.customEdgeStyle);
  return {
    id: row.id,
    title: typeof row.title === "string" ? row.title : "",
    nodes: ensureRoot(nodes),
    ...(edgeStyleId ? { edgeStyleId } : {}),
    ...(customEdgeStyle ? { customEdgeStyle } : {}),
  };
}

function cloneNodes(nodes: MindMapNode[]): MindMapNode[] {
  return nodes.map((node) => ({ ...node }));
}

function cloneDoc(doc: MindMapDoc): MindMapDoc {
  return {
    id: doc.id,
    title: doc.title,
    nodes: cloneNodes(doc.nodes),
    ...(doc.edgeStyleId ? { edgeStyleId: doc.edgeStyleId } : {}),
    ...(doc.customEdgeStyle
      ? { customEdgeStyle: { ...doc.customEdgeStyle } }
      : {}),
  };
}

function cloneDocs(docs: MindMapDoc[]): MindMapDoc[] {
  return docs.map(cloneDoc);
}

function persistLocale(moduleId: string, locale: Locale, docs: MindMapDoc[]) {
  const store = loadStore();
  const bucket = { ...(store[moduleId] ?? {}) };
  bucket[locale] = cloneDocs(docs);
  store[moduleId] = bucket;
  writeStore(store);
}

function readStored(moduleId: string, locale: Locale): MindMapDoc[] | null {
  const bucket = loadStore()[moduleId];
  const list = bucket?.[locale];
  if (!Array.isArray(list)) return null;
  return list
    .map(normalizeDoc)
    .filter((doc): doc is MindMapDoc => Boolean(doc));
}

export function loadMindMaps(
  moduleId: string,
  locale: Locale,
  fallback: MindMapDoc[] = [],
): MindMapDoc[] {
  const stored = readStored(moduleId, locale);
  if (stored) return stored;
  return cloneDocs(fallback);
}

function alignPeerStructure(
  source: MindMapDoc[],
  peerExisting: MindMapDoc[],
): MindMapDoc[] {
  const peerById = new Map(peerExisting.map((doc) => [doc.id, doc]));
  return source.map((doc) => {
    const peer = peerById.get(doc.id);
    if (!peer) {
      return cloneDoc(doc);
    }
    const peerNodeById = new Map(peer.nodes.map((node) => [node.id, node]));
    return {
      id: doc.id,
      title: peer.title || doc.title,
      ...(doc.edgeStyleId ? { edgeStyleId: doc.edgeStyleId } : {}),
      ...(doc.customEdgeStyle
        ? { customEdgeStyle: { ...doc.customEdgeStyle } }
        : {}),
      nodes: doc.nodes.map((node) => {
        const existing = peerNodeById.get(node.id);
        return {
          id: node.id,
          text: existing?.text ?? node.text,
          parentId: node.parentId,
          ...(node.ox ? { ox: node.ox } : {}),
          ...(node.oy ? { oy: node.oy } : {}),
          ...(node.bg ? { bg: node.bg } : {}),
          ...(node.fontId ? { fontId: node.fontId } : {}),
        };
      }),
    };
  });
}

function saveWithPeerStructure(
  moduleId: string,
  locale: Locale,
  docs: MindMapDoc[],
  peerFallback: MindMapDoc[],
) {
  persistLocale(moduleId, locale, docs);
  const peer = otherLocale(locale);
  const peerExisting = readStored(moduleId, peer) ?? cloneDocs(peerFallback);
  persistLocale(moduleId, peer, alignPeerStructure(docs, peerExisting));
  emit(moduleId);
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function createMindMap(
  moduleId: string,
  locale: Locale,
  current: MindMapDoc[],
  seed: { title: string; rootText: string; branchText: string },
  peerFallback: MindMapDoc[] = current,
): { items: MindMapDoc[]; id: string } {
  const id = newId("map");
  const rootId = newId("node");
  const leftId = newId("node");
  const rightId = newId("node");
  const doc: MindMapDoc = {
    id,
    title: seed.title,
    edgeStyleId: "curve-soft",
    nodes: [
      { id: rootId, text: seed.rootText, parentId: null },
      { id: leftId, text: `${seed.branchText} 1`, parentId: rootId },
      { id: rightId, text: `${seed.branchText} 2`, parentId: rootId },
    ],
  };
  const items = [...current, doc];
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  void syncPeerText(moduleId, locale, id, items);
  return { items, id };
}

/** Create a mind map from an already-expanded node list (e.g. templates). */
export function createMindMapFromNodes(
  moduleId: string,
  locale: Locale,
  current: MindMapDoc[],
  seed: { title: string; nodes: MindMapNode[] },
  peerFallback: MindMapDoc[] = current,
): { items: MindMapDoc[]; id: string } {
  const id = newId("map");
  const nodes = ensureRoot(cloneNodes(seed.nodes));
  const doc: MindMapDoc = {
    id,
    title: seed.title,
    nodes,
  };
  const items = [...current, doc];
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  void syncPeerText(moduleId, locale, id, items);
  return { items, id };
}

export function removeMindMap(
  moduleId: string,
  locale: Locale,
  current: MindMapDoc[],
  mapId: string,
  peerFallback: MindMapDoc[] = current,
): MindMapDoc[] {
  const removed = current.find((doc) => doc.id === mapId);
  if (removed) {
    const peer = otherLocale(locale);
    const peerItems = readStored(moduleId, peer) ?? cloneDocs(peerFallback);
    const peerRemoved = peerItems.find((doc) => doc.id === mapId);
    pushMindMapToTrash({
      moduleId,
      title: removed.title.trim() || peerRemoved?.title.trim() || mapId,
      snapshot: {
        [locale]: cloneDoc(removed),
        [peer]: cloneDoc(peerRemoved ?? removed),
      },
    });
  }
  const items = current.filter((doc) => doc.id !== mapId);
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  return items;
}

/** Move a mind map to another module (both locales, no trash). */
export function moveMindMap(
  fromModuleId: string,
  toModuleId: string,
  mapId: string,
): boolean {
  if (fromModuleId === toModuleId) return false;

  const zhFrom = loadMindMaps(fromModuleId, "zh", []);
  const enFrom = loadMindMaps(fromModuleId, "en", []);
  const zhDoc = zhFrom.find((doc) => doc.id === mapId);
  const enDoc = enFrom.find((doc) => doc.id === mapId);
  if (!zhDoc && !enDoc) return false;

  const primary = zhDoc ?? enDoc!;
  const zhTo = loadMindMaps(toModuleId, "zh", []);
  const enTo = loadMindMaps(toModuleId, "en", []);
  if (
    zhTo.some((doc) => doc.id === mapId) ||
    enTo.some((doc) => doc.id === mapId)
  ) {
    return false;
  }

  persistLocale(
    fromModuleId,
    "zh",
    zhFrom.filter((doc) => doc.id !== mapId),
  );
  persistLocale(
    fromModuleId,
    "en",
    enFrom.filter((doc) => doc.id !== mapId),
  );
  persistLocale(toModuleId, "zh", [
    cloneDoc(zhDoc ?? primary),
    ...zhTo,
  ]);
  persistLocale(toModuleId, "en", [
    cloneDoc(enDoc ?? primary),
    ...enTo,
  ]);
  emit(fromModuleId);
  emit(toModuleId);
  return true;
}

export function reorderMindMaps(
  moduleId: string,
  locale: Locale,
  current: MindMapDoc[],
  from: number,
  to: number,
  peerFallback: MindMapDoc[] = current,
): MindMapDoc[] {
  const items = moveIndex(current, from, to);
  if (items === current) return current;
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  return items;
}

function isDescendant(
  nodes: MindMapNode[],
  ancestorId: string,
  maybeDescendantId: string,
): boolean {
  let current: string | null = maybeDescendantId;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  while (current) {
    if (current === ancestorId) return true;
    current = byId.get(current)?.parentId ?? null;
  }
  return false;
}

function withOffsets(
  node: MindMapNode,
  ox?: number,
  oy?: number,
): MindMapNode {
  const nextOx = ox ?? 0;
  const nextOy = oy ?? 0;
  const next: MindMapNode = {
    id: node.id,
    text: node.text,
    parentId: node.parentId,
    ...(node.bg ? { bg: node.bg } : {}),
    ...(node.fontId ? { fontId: node.fontId } : {}),
  };
  if (nextOx !== 0) next.ox = nextOx;
  if (nextOy !== 0) next.oy = nextOy;
  return next;
}

function reorderUnderParent(
  nodes: MindMapNode[],
  parentId: string,
  movedId: string,
  beforeId?: string | null,
): MindMapNode[] {
  const moved = nodes.find((node) => node.id === movedId);
  if (!moved) return nodes;
  const others = nodes.filter((node) => node.id !== movedId);
  const siblings = others.filter((node) => node.parentId === parentId);
  const rest = others.filter((node) => node.parentId !== parentId);
  const nextSiblings = [...siblings];
  if (beforeId) {
    const at = nextSiblings.findIndex((node) => node.id === beforeId);
    if (at >= 0) nextSiblings.splice(at, 0, moved);
    else nextSiblings.push(moved);
  } else {
    nextSiblings.push(moved);
  }
  // Keep non-sibling nodes in prior relative order, inject siblings as a block
  // at the first former sibling index (or end).
  const firstSiblingIndex = nodes.findIndex(
    (node) => node.parentId === parentId || node.id === movedId,
  );
  if (firstSiblingIndex < 0) return [...rest, ...nextSiblings];
  const head = nodes
    .slice(0, firstSiblingIndex)
    .filter(
      (node) => node.id !== movedId && node.parentId !== parentId,
    );
  const tail = nodes
    .slice(firstSiblingIndex)
    .filter(
      (node) => node.id !== movedId && node.parentId !== parentId,
    );
  return [...head, ...nextSiblings, ...tail];
}

/** Reparent a non-root node. Keeps peer locale texts; syncs tree shape. */
export function reparentMindMapNode(
  moduleId: string,
  locale: Locale,
  current: MindMapDoc[],
  mapId: string,
  nodeId: string,
  newParentId: string,
  peerFallback: MindMapDoc[] = current,
): MindMapDoc[] {
  return relocateMindMapNode(
    moduleId,
    locale,
    current,
    mapId,
    nodeId,
    { parentId: newParentId, ox: 0, oy: 0 },
    peerFallback,
  );
}

/**
 * Move a branch: change parent, free-position offsets, and/or sibling order.
 * Structure syncs to the peer locale; texts stay.
 */
export function relocateMindMapNode(
  moduleId: string,
  locale: Locale,
  current: MindMapDoc[],
  mapId: string,
  nodeId: string,
  patch: {
    parentId?: string;
    ox?: number;
    oy?: number;
    beforeId?: string | null;
  },
  peerFallback: MindMapDoc[] = current,
): MindMapDoc[] {
  const items = current.map((doc) => {
    if (doc.id !== mapId) return doc;
    const node = doc.nodes.find((row) => row.id === nodeId);
    if (!node || node.parentId === null) return doc;

    const nextParentId = patch.parentId ?? node.parentId;
    if (nextParentId === nodeId) return doc;
    if (
      patch.parentId &&
      !doc.nodes.some((row) => row.id === patch.parentId)
    ) {
      return doc;
    }
    if (isDescendant(doc.nodes, nodeId, nextParentId)) return doc;

    const nextNode = withOffsets(
      { ...node, parentId: nextParentId },
      patch.ox !== undefined ? patch.ox : node.ox,
      patch.oy !== undefined ? patch.oy : node.oy,
    );

    let nodes = doc.nodes.map((row) => (row.id === nodeId ? nextNode : row));
    if (patch.beforeId !== undefined || patch.parentId !== undefined) {
      nodes = reorderUnderParent(
        nodes,
        nextParentId,
        nodeId,
        patch.beforeId === undefined ? null : patch.beforeId,
      );
    }
    return { ...doc, nodes };
  });
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  return items;
}

export function restoreMindMap(
  moduleId: string,
  snapshot: Partial<Record<Locale, MindMapDoc>>,
): boolean {
  const primary = snapshot.zh ?? snapshot.en;
  if (!primary) return false;

  const zhExisting = loadMindMaps(moduleId, "zh", []);
  const enExisting = loadMindMaps(moduleId, "en", []);
  if (
    zhExisting.some((doc) => doc.id === primary.id) ||
    enExisting.some((doc) => doc.id === primary.id)
  ) {
    return true;
  }

  const zhDoc = snapshot.zh ? cloneDoc(snapshot.zh) : cloneDoc(primary);
  const enDoc = snapshot.en ? cloneDoc(snapshot.en) : cloneDoc(primary);

  persistLocale(moduleId, "zh", [zhDoc, ...zhExisting]);
  persistLocale(moduleId, "en", [enDoc, ...enExisting]);
  emit(moduleId);
  return true;
}

export function updateMindMap(
  moduleId: string,
  locale: Locale,
  current: MindMapDoc[],
  mapId: string,
  patch: {
    title?: string;
    nodes?: MindMapDoc["nodes"];
    edgeStyleId?: string | null;
    customEdgeStyle?: MindMapEdgeStylePayload | null;
  },
  peerFallback: MindMapDoc[] = current,
): MindMapDoc[] {
  const items = current.map((doc) => {
    if (doc.id !== mapId) return doc;
    const next: MindMapDoc = {
      ...doc,
      title: patch.title !== undefined ? patch.title : doc.title,
      nodes: patch.nodes ? ensureRoot(cloneNodes(patch.nodes)) : doc.nodes,
    };
    if ("edgeStyleId" in patch) {
      if (patch.edgeStyleId) next.edgeStyleId = patch.edgeStyleId;
      else delete next.edgeStyleId;
    }
    if ("customEdgeStyle" in patch) {
      if (patch.customEdgeStyle) {
        next.customEdgeStyle = { ...patch.customEdgeStyle };
      } else {
        delete next.customEdgeStyle;
      }
    }
    return next;
  });
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  if (patch.title !== undefined || patch.nodes !== undefined) {
    void syncPeerText(moduleId, locale, mapId, items);
  }
  return items;
}

export function addMindMapChild(
  moduleId: string,
  locale: Locale,
  current: MindMapDoc[],
  mapId: string,
  parentId: string,
  text: string,
  peerFallback: MindMapDoc[] = current,
): { items: MindMapDoc[]; nodeId: string } {
  const nodeId = newId("node");
  const items = current.map((doc) => {
    if (doc.id !== mapId) return doc;
    if (!doc.nodes.some((node) => node.id === parentId)) return doc;
    return {
      ...doc,
      nodes: [...doc.nodes, { id: nodeId, text, parentId }],
    };
  });
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  void syncPeerText(moduleId, locale, mapId, items);
  return { items, nodeId };
}

export function removeMindMapNode(
  moduleId: string,
  locale: Locale,
  current: MindMapDoc[],
  mapId: string,
  nodeId: string,
  peerFallback: MindMapDoc[] = current,
): MindMapDoc[] {
  const items = current.map((doc) => {
    if (doc.id !== mapId) return doc;
    const target = doc.nodes.find((node) => node.id === nodeId);
    if (!target || target.parentId === null) return doc;
    const removeIds = new Set<string>();
    const queue = [nodeId];
    while (queue.length) {
      const id = queue.shift()!;
      removeIds.add(id);
      for (const child of doc.nodes) {
        if (child.parentId === id) queue.push(child.id);
      }
    }
    return {
      ...doc,
      nodes: doc.nodes.filter((node) => !removeIds.has(node.id)),
    };
  });
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  void syncPeerText(moduleId, locale, mapId, items);
  return items;
}

async function syncPeerText(
  moduleId: string,
  locale: Locale,
  mapId: string,
  sourceItems: MindMapDoc[],
) {
  const source = sourceItems.find((doc) => doc.id === mapId);
  if (!source) return;

  const peer = otherLocale(locale);
  const peerItems = readStored(moduleId, peer) ?? cloneDocs(sourceItems);

  const translatedTitle = source.title.trim()
    ? await translateTocNote(source.title, locale, peer)
    : "";
  if (source.title.trim() && translatedTitle) {
    rememberTocPhrase(source.title, translatedTitle, locale);
  }

  const translatedNodes: MindMapNode[] = [];
  for (const node of source.nodes) {
    const text = node.text.trim()
      ? await translateTocNote(node.text, locale, peer)
      : "";
    if (node.text.trim() && text) {
      rememberTocPhrase(node.text, text, locale);
    }
    translatedNodes.push({
      id: node.id,
      text,
      parentId: node.parentId,
      ...(node.ox ? { ox: node.ox } : {}),
      ...(node.oy ? { oy: node.oy } : {}),
      ...(node.bg ? { bg: node.bg } : {}),
      ...(node.fontId ? { fontId: node.fontId } : {}),
    });
  }

  const nextPeer = alignPeerStructure(sourceItems, peerItems).map((doc) =>
    doc.id === mapId
      ? {
          ...doc,
          title: translatedTitle,
          nodes: translatedNodes,
        }
      : doc,
  );

  persistLocale(moduleId, peer, nextPeer);
  emit(moduleId, peer);
}

/** Layout helpers for the canvas. */
export type LaidOutNode = MindMapNode & {
  x: number;
  y: number;
  /** Auto-layout position before manual offsets. */
  baseX: number;
  baseY: number;
  depth: number;
};

const NODE_GAP_X = 180;
const NODE_GAP_Y = 56;

export function layoutMindMap(nodes: MindMapNode[]): LaidOutNode[] {
  const root = nodes.find((node) => node.parentId === null) ?? nodes[0];
  if (!root) return [];

  const children = new Map<string, MindMapNode[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }

  const leafCount = new Map<string, number>();
  function countLeaves(id: string): number {
    const kids = children.get(id) ?? [];
    if (kids.length === 0) {
      leafCount.set(id, 1);
      return 1;
    }
    let total = 0;
    for (const kid of kids) total += countLeaves(kid.id);
    leafCount.set(id, total);
    return total;
  }
  countLeaves(root.id);

  const positions = new Map<string, { x: number; y: number; depth: number }>();

  function place(id: string, depth: number, yStart: number) {
    const leaves = leafCount.get(id) ?? 1;
    const y = yStart + ((leaves - 1) * NODE_GAP_Y) / 2;
    positions.set(id, { x: depth * NODE_GAP_X, y, depth });
    let cursor = yStart;
    for (const kid of children.get(id) ?? []) {
      const kidLeaves = leafCount.get(kid.id) ?? 1;
      place(kid.id, depth + 1, cursor);
      cursor += kidLeaves * NODE_GAP_Y;
    }
  }
  place(root.id, 0, 0);

  return nodes
    .filter((node) => positions.has(node.id))
    .map((node) => {
      const pos = positions.get(node.id)!;
      return {
        ...node,
        x: pos.x + (node.ox ?? 0),
        y: pos.y + (node.oy ?? 0),
        depth: pos.depth,
        baseX: pos.x,
        baseY: pos.y,
      };
    });
}
