"use client";

import { useEffect, useState } from "react";
import {
  getActiveModules,
  getHiddenBuiltinIds,
  MODULE_LAYOUT_EVENT,
} from "@/lib/module-layout";
import { modules, type BuiltinModuleId, type ModuleConfig } from "@/lib/modules";

export function useModuleLayout() {
  const [active, setActive] = useState<ModuleConfig[]>(modules);
  const [hidden, setHidden] = useState<BuiltinModuleId[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function refresh() {
      setActive(getActiveModules());
      setHidden(getHiddenBuiltinIds());
      setReady(true);
    }
    refresh();
    window.addEventListener(MODULE_LAYOUT_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(MODULE_LAYOUT_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return { active, hidden, ready };
}
