import type { AuditLogRecord, ChangeRequestRecord, PushSubscriptionRecord, WorkspaceSettings } from "@/data/types";
import { supabase } from "@/lib/supabase";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  return supabase;
}

async function resolveActiveFamilyContext() {
  const client = requireSupabase();
  const {
    data: { user },
    error: userError
  } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("No authenticated user was found.");
  }

  const familyIdFromMetadata =
    typeof user.user_metadata.family_id === "string" && user.user_metadata.family_id.length > 0
      ? user.user_metadata.family_id
      : null;

  if (familyIdFromMetadata) {
    return {
      userId: user.id,
      familyId: familyIdFromMetadata,
      memberId: null,
      role: null
    };
  }

  const { data, error } = await client
    .from("user_profiles")
    .select("family_members!inner(id,family_id,role,status)")
    .eq("user_id", user.id)
    .eq("family_members.status", "active")
    .limit(1);

  if (error) {
    throw error;
  }

  const membership = data?.[0]?.family_members?.[0];

  if (!membership?.family_id) {
    throw new Error("No active family membership was found for this account.");
  }

  return {
    userId: user.id,
    familyId: membership.family_id as string,
    memberId: membership.id as string,
    role: membership.role as string
  };
}

export async function signInWithSupabase(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithSupabase(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({ email, password });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutFromSupabase() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function updateSupabaseReminderSettings(settings: WorkspaceSettings["reminderSettings"]) {
  const client = requireSupabase();
  const { familyId } = await resolveActiveFamilyContext();

  const { error } = await client.from("settings").upsert({
    family_id: familyId,
    reminder_settings: settings
  });

  if (error) {
    throw error;
  }
}

export async function updateSupabaseDevotionSkipWeekdays(skipWeekdays: WorkspaceSettings["devotionSkipWeekdays"]) {
  const client = requireSupabase();
  const { familyId } = await resolveActiveFamilyContext();

  const { error } = await client.from("settings").upsert({
    family_id: familyId,
    devotion_skip_weekdays: skipWeekdays
  });

  if (error) {
    throw error;
  }
}

export async function upsertPushSubscription(
  subscription: PushSubscriptionRecord,
  options?: {
    familyId?: string;
    installed?: boolean;
  }
) {
  const client = requireSupabase();
  const context = await resolveActiveFamilyContext();

  const { error } = await client.from("push_subscriptions").upsert(
    {
      user_id: context.userId,
      family_id: options?.familyId ?? context.familyId,
      endpoint: subscription.endpoint,
      subscription,
      user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
      installed: options?.installed ?? false,
      is_active: true,
      last_seen_at: new Date().toISOString()
    },
    {
      onConflict: "endpoint"
    }
  );

  if (error) {
    throw error;
  }
}

export async function deletePushSubscription(endpoint: string) {
  const client = requireSupabase();
  const { userId } = await resolveActiveFamilyContext();

  const { error } = await client
    .from("push_subscriptions")
    .update({
      is_active: false,
      last_seen_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) {
    throw error;
  }
}

export async function createChangeRequestInSupabase(values: {
  requestedForMemberId?: string | null;
  requestType: string;
  targetType: string;
  targetId?: string | null;
  title: string;
  details: string;
  proposedChanges?: Record<string, unknown>;
}) {
  const client = requireSupabase();
  const context = await resolveActiveFamilyContext();

  if (!context.memberId) {
    throw new Error("No active family member context was found for this account.");
  }

  const { data, error } = await client
    .from("change_requests")
    .insert({
      family_id: context.familyId,
      requested_by_member_id: context.memberId,
      requested_for_member_id: values.requestedForMemberId ?? null,
      request_type: values.requestType,
      target_type: values.targetType,
      target_id: values.targetId ?? null,
      title: values.title,
      details: values.details,
      proposed_changes: values.proposedChanges ?? {}
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function reviewChangeRequestInSupabase(
  requestId: string,
  status: "approved" | "rejected",
  resolutionNote = ""
) {
  const client = requireSupabase();
  const context = await resolveActiveFamilyContext();

  if (!context.memberId) {
    throw new Error("No active family member context was found for this account.");
  }

  const { data, error } = await client
    .from("change_requests")
    .update({
      status,
      reviewed_by_member_id: context.memberId,
      reviewed_at: new Date().toISOString(),
      resolution_note: resolutionNote
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchChangeRequestsFromSupabase() {
  const client = requireSupabase();
  const context = await resolveActiveFamilyContext();
  let query = client
    .from("change_requests")
    .select("*")
    .eq("family_id", context.familyId)
    .order("created_at", { ascending: false });

  if (context.role !== "parent" && context.role !== "co-admin" && context.memberId) {
    query = query.eq("requested_by_member_id", context.memberId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as ChangeRequestRecord[];
}

export async function fetchAuditLogsFromSupabase(limit = 50) {
  const client = requireSupabase();
  const context = await resolveActiveFamilyContext();
  const { data, error } = await client
    .from("audit_logs")
    .select("*")
    .eq("family_id", context.familyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data as AuditLogRecord[];
}
