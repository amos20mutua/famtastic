import { del, get, set } from "idb-keyval";
import { normalizeWorkspaceState } from "@/data/normalize-workspace";
import type { WorkspaceState } from "@/data/types";

const STORAGE_KEY = "famtastic.workspace";

export async function loadWorkspaceState() {
  const stored = await get<WorkspaceState | undefined>(STORAGE_KEY);
  return normalizeWorkspaceState(stored);
}

export async function saveWorkspaceState(state: WorkspaceState) {
  return set(STORAGE_KEY, state);
}

export async function clearWorkspaceState() {
  return del(STORAGE_KEY);
}
