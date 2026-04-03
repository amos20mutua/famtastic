import { isSupabaseConfigured } from "@/lib/env";

export const repositoryMode = isSupabaseConfigured ? "supabase" : "local-demo";
