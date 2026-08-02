"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GripVertical } from "lucide-react";

type SortableContextValue = {
  dragIndex: number | null;
  overIndex: number | null;
  registerItem: (index: number, el: HTMLElement | null) => void;
  onHandlePointerDown: (
    index: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
};

const SortableContext = createContext<SortableContextValue | null>(null);

/** Ensures only one nested SortableList owns an active drag. */
let activeSortableOwner: symbol | null = null;

interface SortableListProps {
  children: ReactNode;
  count: number;
  onReorder: (from: number, to: number) => void;
}

export function SortableList({
  children,
  count,
  onReorder,
}: SortableListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const itemsRef = useRef<Map<number, HTMLElement>>(new Map());
  const dragIndexRef = useRef<number | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const ownerIdRef = useRef(Symbol("sortable"));
  const onReorderRef = useRef(onReorder);
  const countRef = useRef(count);

  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const registerItem = useCallback((index: number, el: HTMLElement | null) => {
    if (el) itemsRef.current.set(index, el);
    else itemsRef.current.delete(index);
  }, []);

  const findIndexAtPoint = useCallback((x: number, y: number) => {
    let best: { index: number; score: number } | null = null;
    for (const [index, el] of itemsRef.current.entries()) {
      const rect = el.getBoundingClientRect();
      const inside =
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom;
      if (!inside) continue;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const score = (x - cx) ** 2 + (y - cy) ** 2;
      if (!best || score < best.score) best = { index, score };
    }
    return best?.index ?? null;
  }, []);

  const moveToward = useCallback((to: number) => {
    const from = dragIndexRef.current;
    if (from === null || from === to) return;
    if (to < 0 || to >= countRef.current) return;
    onReorderRef.current(from, to);
    dragIndexRef.current = to;
    setDragIndex(to);
    setOverIndex(to);
  }, []);

  const endDrag = useCallback(() => {
    if (activeSortableOwner === ownerIdRef.current) {
      activeSortableOwner = null;
    }
    activePointerRef.current = null;
    dragIndexRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const onHandlePointerDown = useCallback(
    (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      activeSortableOwner = ownerIdRef.current;
      activePointerRef.current = event.pointerId;
      dragIndexRef.current = index;
      setDragIndex(index);
      setOverIndex(index);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    },
    [],
  );

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (activeSortableOwner !== ownerIdRef.current) return;
      if (activePointerRef.current === null) return;
      if (event.pointerId !== activePointerRef.current) return;
      event.preventDefault();
      const target = findIndexAtPoint(event.clientX, event.clientY);
      if (target === null) return;
      if (target !== dragIndexRef.current) {
        setOverIndex(target);
        moveToward(target);
      }
    }

    function onPointerUp(event: PointerEvent) {
      if (activeSortableOwner !== ownerIdRef.current) return;
      if (activePointerRef.current === null) return;
      if (event.pointerId !== activePointerRef.current) return;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      endDrag();
    }

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [endDrag, findIndexAtPoint, moveToward]);

  return (
    <SortableContext.Provider
      value={{
        dragIndex,
        overIndex,
        registerItem,
        onHandlePointerDown,
      }}
    >
      {children}
    </SortableContext.Provider>
  );
}

interface SortableItemProps {
  index: number;
  children: ReactNode;
  className?: string;
}

export function SortableItem({
  index,
  children,
  className = "",
}: SortableItemProps) {
  const ctx = useContext(SortableContext);
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      ctx?.registerItem(index, el);
    },
    [ctx, index],
  );

  if (!ctx) {
    return <div className={className}>{children}</div>;
  }

  const dragging = ctx.dragIndex === index;
  const over =
    ctx.overIndex === index &&
    ctx.dragIndex !== null &&
    ctx.dragIndex !== index;

  return (
    <div
      ref={setRef}
      className={`${className} ${dragging ? "opacity-55 scale-[0.99]" : ""} ${
        over ? "ring-1 ring-accent/50" : ""
      } ${dragging ? "z-10" : ""}`}
    >
      {children}
    </div>
  );
}

interface DragHandleProps {
  index: number;
  label: string;
}

export function DragHandle({ index, label }: DragHandleProps) {
  const ctx = useContext(SortableContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      className="-m-1 cursor-grab touch-none select-none rounded-md p-1.5 text-muted/50 transition-colors hover:bg-white/10 hover:text-foreground/90 active:cursor-grabbing group-hover/item:text-muted/75"
      aria-label={label}
      title={label}
      onPointerDown={(event) => ctx.onHandlePointerDown(index, event)}
      onClick={(event) => event.preventDefault()}
    >
      <GripVertical size={16} strokeWidth={1.75} />
    </button>
  );
}
