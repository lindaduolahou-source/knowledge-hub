"use client";

import type { ReactNode } from "react";

interface RemovableSlotProps {
  removeLabel: string;
  onRemove: () => void;
  children: ReactNode;
  className?: string;
}

/** Card wrapper with a delete control for a single 栏目. */
export function RemovableSlot({
  removeLabel,
  onRemove,
  children,
  className = "",
}: RemovableSlotProps) {
  return (
    <div
      className={`rounded-lg border border-white/10 bg-white/[0.03] p-3 ${className}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          className="relative z-10 mt-0.5 shrink-0 cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
          aria-label={removeLabel}
          title={removeLabel}
        >
          ×
        </button>
      </div>
    </div>
  );
}
