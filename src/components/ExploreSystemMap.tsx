"use client";

import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { Locale } from "@/i18n/config";
import { useModuleLayout } from "@/hooks/useModuleLayout";
import { ModuleDeck } from "./ModuleDeck";

interface ExploreSystemMapProps {
  locale: string;
  dict: Dictionary;
}

export function ExploreSystemMap({ locale, dict }: ExploreSystemMapProps) {
  const loc = locale as Locale;
  const { active } = useModuleLayout();

  return (
    <div className="explore-system relative mx-auto w-full max-w-3xl px-1">
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-16 flex h-52 w-52 shrink-0 items-center justify-center sm:mb-20 sm:h-56 sm:w-56">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <span className="absolute inset-0 rounded-full border border-white/12" />
            <span className="absolute inset-[16%] rounded-full border border-white/10" />
            <span className="absolute inset-[32%] rounded-full border border-dashed border-white/12" />
            <span className="absolute inset-[48%] rounded-full border border-white/8" />
            <span className="absolute left-1/2 top-[8%] h-[84%] w-px -translate-x-1/2 bg-white/8" />
            <span className="absolute left-[8%] top-1/2 h-px w-[84%] -translate-y-1/2 bg-white/8" />
          </div>

          <div className="explore-core relative z-10 flex h-32 w-32 flex-col items-center justify-center rounded-full border border-white/30 bg-black/50 px-2 backdrop-blur-sm sm:h-36 sm:w-36">
            <span className="mb-1 text-[10px] tracking-[0.28em] text-white/50 uppercase">
              {dict.explore.core}
            </span>
            <span className="font-handwrite text-center text-base leading-tight text-white sm:text-lg">
              {dict.explore.title}
            </span>
            <span className="mt-1 text-[9px] tracking-wider text-white/45">
              ● {dict.explore.online}
            </span>
          </div>
        </div>

        <ModuleDeck locale={loc} dict={dict} variant="grid" />

        <p className="mt-8 flex gap-4 text-[10px] tracking-[0.18em] text-white/30 uppercase">
          <span>SYS/{active.length || "—"}</span>
          <span>GRID.ACTIVE</span>
          <span>LINK.OK</span>
        </p>
      </div>
    </div>
  );
}
