import type { ReactNode } from "react";
import { AppStateProvider } from "@/state/app-state";

export function AppProviders({ children }: { children: ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}
