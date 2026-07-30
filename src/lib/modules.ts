export type BuiltinModuleId =
  | "space"
  | "roadmap"
  | "knowledge"
  | "lab"
  | "thoughts"
  | "contact";

/** Builtin or custom (`custom-…`) module id. */
export type ModuleId = BuiltinModuleId | (string & {});

export const BUILTIN_MODULE_IDS: BuiltinModuleId[] = [
  "space",
  "roadmap",
  "knowledge",
  "lab",
  "thoughts",
  "contact",
];

export function isBuiltinModuleId(id: string): id is BuiltinModuleId {
  return (BUILTIN_MODULE_IDS as string[]).includes(id);
}

export interface ModuleConfig {
  id: ModuleId;
  href: string;
  /** Soft monochrome accent used sparingly across the site */
  color: string;
  bg: string;
  border: string;
  glow: string;
  icon: string;
}

const soft = "#b7c4ce";

export const modules: ModuleConfig[] = [
  {
    id: "space",
    href: "/space",
    color: soft,
    bg: "bg-white/5",
    border: "border-white/15",
    glow: "hover:shadow-white/5",
    icon: "◈",
  },
  {
    id: "roadmap",
    href: "/roadmap",
    color: soft,
    bg: "bg-white/5",
    border: "border-white/15",
    glow: "hover:shadow-white/5",
    icon: "◎",
  },
  {
    id: "knowledge",
    href: "/blog",
    color: soft,
    bg: "bg-white/5",
    border: "border-white/15",
    glow: "hover:shadow-white/5",
    icon: "✦",
  },
  {
    id: "lab",
    href: "/projects",
    color: soft,
    bg: "bg-white/5",
    border: "border-white/15",
    glow: "hover:shadow-white/5",
    icon: "⬡",
  },
  {
    id: "thoughts",
    href: "/thoughts",
    color: soft,
    bg: "bg-white/5",
    border: "border-white/15",
    glow: "hover:shadow-white/5",
    icon: "✺",
  },
  {
    id: "contact",
    href: "/contact",
    color: soft,
    bg: "bg-white/5",
    border: "border-white/15",
    glow: "hover:shadow-white/5",
    icon: "◉",
  },
];

export function getModule(id: BuiltinModuleId): ModuleConfig {
  return modules.find((m) => m.id === id)!;
}

export function getModuleByHref(href: string): ModuleConfig | undefined {
  return modules.find((m) => m.href === href);
}
