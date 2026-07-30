import type { ModuleId } from "./modules";

export interface SystemNode {
  id: ModuleId;
}

/** Ordered system nodes for the explore hub */
export const SYSTEM_NODES: SystemNode[] = [
  { id: "space" },
  { id: "roadmap" },
  { id: "knowledge" },
  { id: "lab" },
  { id: "thoughts" },
  { id: "contact" },
];
