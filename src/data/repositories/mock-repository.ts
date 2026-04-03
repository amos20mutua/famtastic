import { createSeedWorkspace } from "@/data/seed";

export function createMockRepository() {
  return {
    async loadWorkspace() {
      return createSeedWorkspace();
    }
  };
}
