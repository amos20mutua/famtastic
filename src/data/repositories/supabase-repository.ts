import { defaultWorkspaceSettings } from "@/data/seed";
import type {
  AuditLogRecord,
  ChangeRequestRecord,
  FamilyRole,
  NotificationPreferences,
  PushSubscriptionRecord,
  QueuedMutation,
  WorkspaceSettings,
  WorkspaceState
} from "@/data/types";
import { supabase } from "@/lib/supabase";

interface FamilyContext {
  userId: string;
  familyId: string;
  memberId: string | null;
  role: FamilyRole | null;
}

export interface SupabaseReplayFailure {
  mutationId: string;
  message: string;
}

export interface SupabaseReplayResult {
  appliedMutationIds: string[];
  failedMutations: SupabaseReplayFailure[];
}

const COMPLEX_PLANNING_MUTATIONS = new Set([
  "duty-template:update",
  "duty-template:toggle-participant",
  "duty-template:toggle-rest-day",
  "duty-assignment:override",
  "duty-template:move-member",
  "duty-template:toggle-pause",
  "duty-template:reset-rotation",
  "schedule:generate-week"
]);

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  browser: true,
  stickyCards: true,
  devotionAlerts: true,
  mealAlerts: true,
  dutyAlerts: true,
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "06:00"
};

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  return supabase;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isFinite(item));
}

function toTimeString(value: unknown, fallback = "00:00") {
  const raw = asString(value, fallback);
  return raw.length >= 5 ? raw.slice(0, 5) : fallback;
}

function toDatabaseTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function normalizeRole(value: unknown): FamilyRole {
  if (value === "parent" || value === "co-admin" || value === "member") {
    return value;
  }

  return "member";
}

function normalizeDutyCategory(value: unknown): WorkspaceState["dutyTemplates"][number]["category"] {
  const category = asString(value);

  if (category === "cooking" || category === "dishes" || category === "cleaning" || category === "laundry" || category === "general") {
    return category;
  }

  return "general";
}

function normalizeDutyRecurrence(value: unknown): WorkspaceState["dutyTemplates"][number]["recurrence"] {
  const recurrence = asString(value);

  if (recurrence === "daily" || recurrence === "weekdays" || recurrence === "weekly" || recurrence === "custom") {
    return recurrence;
  }

  return "daily";
}

function normalizeUrgency(value: unknown): WorkspaceState["dutyTemplates"][number]["urgency"] {
  const urgency = asString(value);

  if (urgency === "low" || urgency === "medium" || urgency === "high" || urgency === "critical") {
    return urgency;
  }

  return "medium";
}

function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const source = isRecord(value) ? value : {};

  return {
    browser: asBoolean(source.browser, DEFAULT_NOTIFICATION_PREFERENCES.browser),
    stickyCards: asBoolean(source.stickyCards, DEFAULT_NOTIFICATION_PREFERENCES.stickyCards),
    devotionAlerts: asBoolean(source.devotionAlerts, DEFAULT_NOTIFICATION_PREFERENCES.devotionAlerts),
    mealAlerts: asBoolean(source.mealAlerts, DEFAULT_NOTIFICATION_PREFERENCES.mealAlerts),
    dutyAlerts: asBoolean(source.dutyAlerts, DEFAULT_NOTIFICATION_PREFERENCES.dutyAlerts),
    quietHoursEnabled: asBoolean(source.quietHoursEnabled, DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnabled),
    quietHoursStart: asString(source.quietHoursStart, DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart),
    quietHoursEnd: asString(source.quietHoursEnd, DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd)
  };
}

function toShortName(name: string) {
  const letters = name
    .split(" ")
    .map((chunk) => chunk.trim().slice(0, 1))
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return letters || "FM";
}

function toDisplayNameFromEmail(email: string) {
  const label = email.split("@")[0]?.trim() ?? "";

  if (!label) {
    return "Family member";
  }

  return label
    .split(/[._-]+/)
    .map((chunk) => chunk.slice(0, 1).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function isGovernanceRole(role: FamilyRole | null) {
  return role === "parent" || role === "co-admin";
}

function mapChangeRequestRecord(row: Record<string, unknown>): ChangeRequestRecord {
  return {
    id: asString(row.id),
    familyId: asString(row.family_id),
    type:
      row.request_type === "meal-reassign" || row.request_type === "devotion-reassign" || row.request_type === "schedule-change"
        ? row.request_type
        : "duty-swap",
    targetType:
      row.target_type === "duty-template" ||
      row.target_type === "duty-assignment" ||
      row.target_type === "devotion" ||
      row.target_type === "meal" ||
      row.target_type === "shopping-item" ||
      row.target_type === "member" ||
      row.target_type === "settings" ||
      row.target_type === "change-request" ||
      row.target_type === "schedule"
        ? row.target_type
        : "schedule",
    targetId: row.target_id === null ? null : asString(row.target_id) || null,
    requestedById: asString(row.requested_by_member_id),
    requestedForMemberId: row.requested_for_member_id === null ? null : asString(row.requested_for_member_id) || null,
    title: asString(row.title),
    details: asString(row.details),
    proposedChanges: isRecord(row.proposed_changes) ? row.proposed_changes : {},
    status: row.status === "approved" || row.status === "rejected" ? row.status : "pending",
    reviewedById: row.reviewed_by_member_id === null ? null : asString(row.reviewed_by_member_id) || null,
    reviewedAt: row.reviewed_at === null ? null : asString(row.reviewed_at) || null,
    resolutionNote: asString(row.resolution_note),
    createdAt: asString(row.created_at, new Date().toISOString())
  };
}

function mapAuditRecord(row: Record<string, unknown>): AuditLogRecord {
  return {
    id: asString(row.id),
    familyId: asString(row.family_id),
    entityType:
      row.entity_type === "duty-template" ||
      row.entity_type === "duty-assignment" ||
      row.entity_type === "devotion" ||
      row.entity_type === "meal" ||
      row.entity_type === "shopping-item" ||
      row.entity_type === "member" ||
      row.entity_type === "settings" ||
      row.entity_type === "change-request" ||
      row.entity_type === "schedule"
        ? row.entity_type
        : "settings",
    entityId: row.entity_id === null ? null : asString(row.entity_id) || null,
    action:
      row.action === "create" ||
      row.action === "edit" ||
      row.action === "delete" ||
      row.action === "archive" ||
      row.action === "reassign" ||
      row.action === "complete" ||
      row.action === "reopen" ||
      row.action === "approve" ||
      row.action === "reject" ||
      row.action === "role-change" ||
      row.action === "settings-update" ||
      row.action === "generate" ||
      row.action === "request"
        ? row.action
        : "edit",
    actorId: row.actor_member_id === null ? null : asString(row.actor_member_id) || null,
    actorRole:
      row.actor_role === "parent" || row.actor_role === "co-admin" || row.actor_role === "member"
        ? row.actor_role
        : "system",
    summary: asString(row.summary),
    oldValue: isRecord(row.old_value) ? row.old_value : null,
    newValue: isRecord(row.new_value) ? row.new_value : null,
    createdAt: asString(row.created_at, new Date().toISOString())
  };
}

function mapPrefamilyWorkspace(
  user: { id: string; email?: string | null },
  profile: Record<string, unknown> | null
): WorkspaceState {
  const email = asString(profile?.email, user.email ?? "");
  const displayName = asString(profile?.display_name, toDisplayNameFromEmail(email || "family.member"));
  const pseudoMemberId = asString(profile?.id, user.id);

  return {
    family: null,
    members: [
      {
        id: pseudoMemberId,
        familyId: null,
        email,
        displayName,
        shortName: asString(profile?.short_name, toShortName(displayName)),
        avatarTone: asString(profile?.avatar_tone, "#274337"),
        avatarSeed: asString(profile?.avatar_seed, `${displayName.toLowerCase().replace(/\s+/g, "-")}-${pseudoMemberId}`),
        role: "parent",
        notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES
      }
    ],
    dutyTemplates: [],
    dutyAssignments: [],
    devotionAssignments: [],
    meals: [],
    shoppingItems: [],
    notifications: [],
    completionLogs: [],
    changeRequests: [],
    auditLogs: [],
    settings: defaultWorkspaceSettings(),
    queuedMutations: [],
    readReminderIds: [],
    browserPromptedIds: [],
    session: {
      userId: pseudoMemberId,
      onboardingComplete: false,
      authMode: "supabase",
      lastSeenAt: new Date().toISOString()
    }
  };
}

async function loadCurrentUserProfile(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("user_profiles")
    .select("id,user_id,email,display_name,short_name,avatar_seed,avatar_tone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return isRecord(data) ? data : null;
}

async function resolveOptionalFamilyContextForUser(userId: string): Promise<FamilyContext | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("user_profiles")
    .select("family_members!inner(id,family_id,role,status)")
    .eq("user_id", userId)
    .eq("family_members.status", "active")
    .limit(1);

  if (error) {
    throw error;
  }

  const first = Array.isArray(data) ? data[0] : null;
  const membershipSource = isRecord(first) ? first.family_members : null;
  const membership =
    Array.isArray(membershipSource) && membershipSource.length > 0
      ? membershipSource[0]
      : isRecord(membershipSource)
        ? membershipSource
        : null;

  if (!isRecord(membership) || !asString(membership.family_id)) {
    return null;
  }

  return {
    userId,
    familyId: asString(membership.family_id),
    memberId: asString(membership.id) || null,
    role: normalizeRole(membership.role)
  };
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

  const context = await resolveOptionalFamilyContextForUser(user.id);

  if (!context) {
    throw new Error("No active family membership was found for this account.");
  }

  return context;
}

async function fetchChangeRequestRows(context: FamilyContext) {
  const client = requireSupabase();
  let query = client
    .from("change_requests")
    .select("*")
    .eq("family_id", context.familyId)
    .order("created_at", { ascending: false });

  if (!isGovernanceRole(context.role) && context.memberId) {
    query = query.eq("requested_by_member_id", context.memberId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function fetchAuditRows(context: FamilyContext, limit = 50) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("audit_logs")
    .select("*")
    .eq("family_id", context.familyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
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

export async function createFamilyWorkspaceInSupabase(familyName: string) {
  const client = requireSupabase();
  const trimmed = familyName.trim();

  if (!trimmed) {
    throw new Error("Family name is required.");
  }

  const { error } = await client.rpc("create_family_workspace", {
    family_name: trimmed
  });

  if (error) {
    throw error;
  }
}

export async function joinFamilyWorkspaceInSupabase(inviteCode: string) {
  const client = requireSupabase();
  const normalizedCode = inviteCode.trim().toUpperCase();

  if (!normalizedCode) {
    throw new Error("Invite code is required.");
  }

  const { error } = await client.rpc("join_family_workspace", {
    invite_code: normalizedCode
  });

  if (error) {
    throw error;
  }
}

export async function fetchWorkspaceFromSupabase(): Promise<WorkspaceState | null> {
  const client = requireSupabase();
  const {
    data: { user },
    error: userError
  } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const profile = await loadCurrentUserProfile(user.id);
  const context = await resolveOptionalFamilyContextForUser(user.id);

  if (!context) {
    return mapPrefamilyWorkspace(
      {
        id: user.id,
        email: user.email
      },
      profile
    );
  }

  const familyId = context.familyId;
  const settingsDefaults = defaultWorkspaceSettings();
  const [familyResponse, settingsResponse, membersResponse, dutiesResponse, rotationsResponse, assignmentsResponse, devotionsResponse, mealsResponse, shoppingResponse, notificationsResponse, completionResponse, changeRows, auditRows] =
    await Promise.all([
      client.from("families").select("id,name,timezone,invite_code,motto,devotion_rhythm,created_at").eq("id", familyId).single(),
      client
        .from("settings")
        .select("family_id,reminder_settings,shopping_categories,meal_focus,devotion_time,devotion_skip_weekdays")
        .eq("family_id", familyId)
        .maybeSingle(),
      client
        .from("family_members")
        .select("id,family_id,profile_id,role,status,notification_preferences")
        .eq("family_id", familyId)
        .eq("status", "active"),
      client.from("duties").select("*").eq("family_id", familyId),
      client.from("duty_rotation_members").select("duty_id,member_id,position,is_paused").eq("family_id", familyId),
      client.from("duty_assignments").select("*").eq("family_id", familyId),
      client.from("devotion_schedule").select("*").eq("family_id", familyId),
      client.from("meals").select("*").eq("family_id", familyId),
      client.from("shopping_items").select("*").eq("family_id", familyId),
      client.from("notifications").select("id,family_id,title,body,severity,channel,created_at").eq("family_id", familyId),
      client.from("completion_logs").select("*").eq("family_id", familyId),
      fetchChangeRequestRows(context),
      fetchAuditRows(context, 80)
    ]);

  if (familyResponse.error) {
    throw familyResponse.error;
  }

  if (settingsResponse.error) {
    throw settingsResponse.error;
  }

  if (membersResponse.error) {
    throw membersResponse.error;
  }

  if (dutiesResponse.error) {
    throw dutiesResponse.error;
  }

  if (rotationsResponse.error) {
    throw rotationsResponse.error;
  }

  if (assignmentsResponse.error) {
    throw assignmentsResponse.error;
  }

  if (devotionsResponse.error) {
    throw devotionsResponse.error;
  }

  if (mealsResponse.error) {
    throw mealsResponse.error;
  }

  if (shoppingResponse.error) {
    throw shoppingResponse.error;
  }

  if (notificationsResponse.error) {
    throw notificationsResponse.error;
  }

  if (completionResponse.error) {
    throw completionResponse.error;
  }

  const memberRows = Array.isArray(membersResponse.data) ? membersResponse.data : [];
  const profileIds = [...new Set(memberRows.map((row) => asString(row.profile_id)).filter(Boolean))];
  let profilesById = new Map<string, Record<string, unknown>>();

  if (profileIds.length > 0) {
    const { data: profileRows, error: profilesError } = await client
      .from("user_profiles")
      .select("id,user_id,email,display_name,short_name,avatar_seed,avatar_tone")
      .in("id", profileIds);

    if (profilesError) {
      throw profilesError;
    }

    profilesById = new Map(
      (Array.isArray(profileRows) ? profileRows : [])
        .filter((row) => isRecord(row))
        .map((row) => [asString(row.id), row])
    );
  }

  const notificationRows = Array.isArray(notificationsResponse.data) ? notificationsResponse.data : [];
  const notificationIds = notificationRows.map((row) => asString(row.id)).filter(Boolean);
  const readByMap = new Map<string, string[]>();

  if (notificationIds.length > 0) {
    const { data: readRows, error: readError } = await client
      .from("notification_reads")
      .select("notification_id,member_id")
      .in("notification_id", notificationIds);

    if (readError) {
      throw readError;
    }

    (Array.isArray(readRows) ? readRows : []).forEach((row) => {
      const notificationId = asString(row.notification_id);
      const memberId = asString(row.member_id);

      if (!notificationId || !memberId) {
        return;
      }

      const existing = readByMap.get(notificationId) ?? [];
      readByMap.set(notificationId, [...existing, memberId]);
    });
  }

  const rotationRows = Array.isArray(rotationsResponse.data) ? rotationsResponse.data : [];
  const rotationsByDutyId = new Map<string, Array<Record<string, unknown>>>();

  rotationRows.forEach((row) => {
    const dutyId = asString(row.duty_id);

    if (!dutyId) {
      return;
    }

    const bucket = rotationsByDutyId.get(dutyId) ?? [];
    bucket.push(row as Record<string, unknown>);
    rotationsByDutyId.set(dutyId, bucket);
  });

  const familyRecord = familyResponse.data as Record<string, unknown>;
  const settingsRecord: Record<string, unknown> = isRecord(settingsResponse.data) ? settingsResponse.data : {};
  const workspaceMembers = memberRows.map((row) => {
    const profileRecord = profilesById.get(asString(row.profile_id));
    const displayName = asString(profileRecord?.display_name, "Family member");
    const memberId = asString(row.id);

    return {
      id: memberId,
      familyId: asString(row.family_id) || null,
      email: asString(profileRecord?.email),
      displayName,
      shortName: asString(profileRecord?.short_name, toShortName(displayName)),
      avatarTone: asString(profileRecord?.avatar_tone, "#274337"),
      avatarSeed: asString(profileRecord?.avatar_seed, `${displayName.toLowerCase().replace(/\s+/g, "-")}-${memberId}`),
      role: normalizeRole(row.role),
      notificationPreferences: normalizeNotificationPreferences(row.notification_preferences)
    };
  });

  const dutyTemplates: WorkspaceState["dutyTemplates"] = (Array.isArray(dutiesResponse.data) ? dutiesResponse.data : [])
    .filter((row) => isRecord(row))
    .map((row) => {
      const dutyId = asString(row.id);
      const rotationRowsForDuty = (rotationsByDutyId.get(dutyId) ?? []).sort(
        (left, right) => Number(left.position ?? 0) - Number(right.position ?? 0)
      );
      const participantMemberIds = rotationRowsForDuty.map((item) => asString(item.member_id)).filter(Boolean);

      return {
        id: dutyId,
        familyId: asString(row.family_id),
        title: asString(row.title, "Duty"),
        description: asString(row.description),
        category: normalizeDutyCategory(row.category),
        dueTime: toTimeString(row.default_due_time, "18:00"),
        recurrence: normalizeDutyRecurrence(row.recurrence),
        startsOn: asString(row.starts_on, new Date().toISOString().slice(0, 10)),
        intervalDays: Math.max(1, Number(row.interval_days ?? 1)),
        urgency: normalizeUrgency(row.urgency),
        assignmentMode: row.assignment_mode === "fixed" ? "fixed" : "rotation",
        fixedAssigneeId: row.fixed_member_id === null ? null : asString(row.fixed_member_id) || null,
        participantMemberIds:
          participantMemberIds.length > 0
            ? participantMemberIds
            : row.fixed_member_id
              ? [asString(row.fixed_member_id)]
              : [],
        rotationOrder: participantMemberIds,
        rotationCursor: Math.max(0, Number(row.rotation_cursor ?? 0)),
        lastAssignedMemberId: row.last_assigned_member_id === null ? null : asString(row.last_assigned_member_id) || null,
        lastAssignedAt: row.last_assigned_at === null ? null : asString(row.last_assigned_at) || null,
        pausedMemberIds: rotationRowsForDuty.filter((item) => Boolean(item.is_paused)).map((item) => asString(item.member_id)),
        skipWeekdays: asNumberArray(row.skip_weekdays).filter((day) => day >= 0 && day <= 6),
        skipDates: Array.isArray(row.skip_dates) ? row.skip_dates.map((item) => asString(item)).filter(Boolean) : [],
        active: row.is_active !== false
      };
    });

  const workspace: WorkspaceState = {
    family: {
      id: asString(familyRecord.id),
      name: asString(familyRecord.name, "Family"),
      timezone: asString(familyRecord.timezone, "Africa/Nairobi"),
      inviteCode: asString(familyRecord.invite_code, "FAMT-0000"),
      motto: asString(familyRecord.motto),
      devotionRhythm: asString(familyRecord.devotion_rhythm, "Evening circle"),
      createdAt: asString(familyRecord.created_at, new Date().toISOString())
    },
    members: workspaceMembers,
    dutyTemplates,
    dutyAssignments: [],
    devotionAssignments: [],
    meals: [],
    shoppingItems: [],
    notifications: [],
    completionLogs: [],
    changeRequests: [],
    auditLogs: [],
    settings: {
      reminderSettings: {
        dueSoonMinutes: Number((settingsRecord.reminder_settings as Record<string, unknown> | undefined)?.dueSoonMinutes ?? settingsDefaults.reminderSettings.dueSoonMinutes),
        upcomingWindowHours: Number((settingsRecord.reminder_settings as Record<string, unknown> | undefined)?.upcomingWindowHours ?? settingsDefaults.reminderSettings.upcomingWindowHours),
        escalationMinutes: Number((settingsRecord.reminder_settings as Record<string, unknown> | undefined)?.escalationMinutes ?? settingsDefaults.reminderSettings.escalationMinutes),
        browserNotifications: asBoolean(
          (settingsRecord.reminder_settings as Record<string, unknown> | undefined)?.browserNotifications,
          settingsDefaults.reminderSettings.browserNotifications
        ),
        stickyOverdue: asBoolean(
          (settingsRecord.reminder_settings as Record<string, unknown> | undefined)?.stickyOverdue,
          settingsDefaults.reminderSettings.stickyOverdue
        ),
        badgeCounts: asBoolean(
          (settingsRecord.reminder_settings as Record<string, unknown> | undefined)?.badgeCounts,
          settingsDefaults.reminderSettings.badgeCounts
        )
      },
      shoppingCategories: Array.isArray(settingsRecord.shopping_categories)
        ? settingsRecord.shopping_categories.map((item: unknown) => asString(item)).filter(Boolean)
        : settingsDefaults.shoppingCategories,
      mealFocus: asString(settingsRecord.meal_focus, settingsDefaults.mealFocus),
      devotionTime: toTimeString(settingsRecord.devotion_time, settingsDefaults.devotionTime),
      devotionSkipWeekdays: asNumberArray(settingsRecord.devotion_skip_weekdays).filter((day) => day >= 0 && day <= 6)
    },
    queuedMutations: [],
    readReminderIds: [],
    browserPromptedIds: [],
    session: {
      userId: context.memberId,
      onboardingComplete: true,
      authMode: "supabase",
      lastSeenAt: new Date().toISOString()
    }
  };

  workspace.dutyAssignments = (Array.isArray(assignmentsResponse.data) ? assignmentsResponse.data : [])
    .filter((row) => isRecord(row))
    .map((row) => ({
      id: asString(row.id),
      familyId: asString(row.family_id),
      templateId: asString(row.duty_id),
      title: asString(row.title, "Duty"),
      description: asString(row.description),
      assignedTo: asString(row.assigned_member_id),
      scheduledAssigneeId: asString(row.scheduled_member_id, asString(row.assigned_member_id)),
      assignmentSource:
        row.assignment_source === "fixed" ||
        row.assignment_source === "temporary-cover" ||
        row.assignment_source === "rotation-shift"
          ? row.assignment_source
          : "rotation",
      overrideNote: asString(row.override_note),
      dueAt: asString(row.due_at, new Date().toISOString()),
      recurrence: normalizeDutyRecurrence(row.recurrence_snapshot),
      urgency: normalizeUrgency(row.urgency),
      status: row.status === "done" ? "done" : "pending",
      completedAt: row.completed_at === null ? null : asString(row.completed_at) || null
    }));

  workspace.devotionAssignments = (Array.isArray(devotionsResponse.data) ? devotionsResponse.data : [])
    .filter((row) => isRecord(row))
    .map((row) => ({
      id: asString(row.id),
      familyId: asString(row.family_id),
      date: asString(row.scheduled_for),
      time: toTimeString(row.start_time, settingsDefaults.devotionTime),
      leaderId: asString(row.leader_member_id),
      bibleReading: asString(row.bible_reading),
      topic: asString(row.topic),
      notes: asString(row.notes),
      status: row.status === "done" ? "done" : "planned"
    }));

  workspace.meals = (Array.isArray(mealsResponse.data) ? mealsResponse.data : [])
    .filter((row) => isRecord(row))
    .map((row) => ({
      id: asString(row.id),
      familyId: asString(row.family_id),
      date: asString(row.scheduled_for),
      title: asString(row.title),
      cookId: asString(row.cook_member_id),
      ingredients: Array.isArray(row.ingredients) ? row.ingredients.map((item) => asString(item)).filter(Boolean) : [],
      notes: asString(row.notes),
      status: row.status === "done" ? "done" : "planned"
    }));

  workspace.shoppingItems = (Array.isArray(shoppingResponse.data) ? shoppingResponse.data : [])
    .filter((row) => isRecord(row))
    .map((row) => ({
      id: asString(row.id),
      familyId: asString(row.family_id),
      name: asString(row.name),
      category: asString(row.category),
      urgency: normalizeUrgency(row.urgency),
      addedById: asString(row.added_by_member_id),
      createdAt: asString(row.created_at, new Date().toISOString()),
      checked: Boolean(row.checked),
      checkedAt: row.checked_at === null ? null : asString(row.checked_at) || null
    }));

  workspace.notifications = notificationRows
    .filter((row) => isRecord(row))
    .map((row) => ({
      id: asString(row.id),
      familyId: asString(row.family_id),
      title: asString(row.title),
      body: asString(row.body),
      severity: row.severity === "important" || row.severity === "urgent" ? row.severity : "gentle",
      channel: row.channel === "browser" || row.channel === "push" ? row.channel : "in-app",
      createdAt: asString(row.created_at, new Date().toISOString()),
      readBy: readByMap.get(asString(row.id)) ?? [],
      source: "system"
    }));

  workspace.completionLogs = (Array.isArray(completionResponse.data) ? completionResponse.data : [])
    .filter((row) => isRecord(row))
    .map((row) => ({
      id: asString(row.id),
      familyId: asString(row.family_id),
      assignmentType: row.assignment_type === "meal" || row.assignment_type === "devotion" ? row.assignment_type : "duty",
      assignmentId: asString(row.assignment_id),
      memberId: asString(row.member_id),
      completedAt: asString(row.completed_at, new Date().toISOString()),
      status: row.outcome === "missed" ? "missed" : "completed"
    }));

  workspace.changeRequests = changeRows.filter((row) => isRecord(row)).map((row) => mapChangeRequestRecord(row));
  workspace.auditLogs = auditRows.filter((row) => isRecord(row)).map((row) => mapAuditRecord(row));

  return workspace;
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
  const context = await resolveActiveFamilyContext();
  const rows = await fetchChangeRequestRows(context);
  return rows.filter((row) => isRecord(row)).map((row) => mapChangeRequestRecord(row));
}

export async function fetchAuditLogsFromSupabase(limit = 50) {
  const context = await resolveActiveFamilyContext();
  const rows = await fetchAuditRows(context, limit);
  return rows.filter((row) => isRecord(row)).map((row) => mapAuditRecord(row));
}

function mutationNeedsPlanningSync(type: string) {
  return COMPLEX_PLANNING_MUTATIONS.has(type);
}

function getWorkspaceFamilyId(workspace: WorkspaceState) {
  if (!workspace.family?.id) {
    throw new Error("No active family workspace is available.");
  }

  return workspace.family.id;
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown replay failure.";
}

async function syncComplexPlanningSnapshot(workspace: WorkspaceState, context: FamilyContext) {
  const client = requireSupabase();
  const familyId = getWorkspaceFamilyId(workspace);

  if (familyId !== context.familyId) {
    throw new Error("Family mismatch between local state and active Supabase context.");
  }

  const dutyRows = workspace.dutyTemplates.map((template) => ({
    id: template.id,
    family_id: familyId,
    title: template.title,
    description: template.description,
    category: template.category,
    default_due_time: toDatabaseTime(template.dueTime),
    recurrence: template.recurrence,
    urgency: template.urgency,
    assignment_mode: template.assignmentMode,
    starts_on: template.startsOn,
    interval_days: template.intervalDays,
    fixed_member_id: template.fixedAssigneeId,
    rotation_cursor: template.rotationCursor,
    last_assigned_member_id: template.lastAssignedMemberId,
    last_assigned_at: template.lastAssignedAt,
    skip_weekdays: template.skipWeekdays,
    skip_dates: template.skipDates,
    is_active: template.active
  }));

  if (dutyRows.length > 0) {
    const { error: dutyError } = await client.from("duties").upsert(dutyRows, { onConflict: "id" });

    if (dutyError) {
      throw dutyError;
    }
  }

  const rotationRows = workspace.dutyTemplates.flatMap((template) => {
    const participantSet = new Set(template.participantMemberIds);
    const ordered = template.rotationOrder.filter((memberId) => participantSet.has(memberId));

    template.participantMemberIds.forEach((memberId) => {
      if (!ordered.includes(memberId)) {
        ordered.push(memberId);
      }
    });

    return ordered.map((memberId, position) => ({
      family_id: familyId,
      duty_id: template.id,
      member_id: memberId,
      position,
      is_paused: template.pausedMemberIds.includes(memberId)
    }));
  });

  const { error: clearRotationError } = await client.from("duty_rotation_members").delete().eq("family_id", familyId);

  if (clearRotationError) {
    throw clearRotationError;
  }

  if (rotationRows.length > 0) {
    const { error: insertRotationError } = await client.from("duty_rotation_members").insert(rotationRows);

    if (insertRotationError) {
      throw insertRotationError;
    }
  }

  const assignmentRows = workspace.dutyAssignments.map((assignment) => ({
    id: assignment.id,
    family_id: familyId,
    duty_id: assignment.templateId,
    assigned_member_id: assignment.assignedTo,
    scheduled_member_id: assignment.scheduledAssigneeId,
    title: assignment.title,
    description: assignment.description,
    due_at: assignment.dueAt,
    recurrence_snapshot: assignment.recurrence,
    urgency: assignment.urgency,
    status: assignment.status,
    completed_at: assignment.completedAt,
    assignment_source: assignment.assignmentSource,
    override_note: assignment.overrideNote
  }));

  if (assignmentRows.length > 0) {
    const { error: assignmentError } = await client.from("duty_assignments").upsert(assignmentRows, { onConflict: "id" });

    if (assignmentError) {
      throw assignmentError;
    }
  }

  const devotionRows = workspace.devotionAssignments.map((devotion) => ({
    id: devotion.id,
    family_id: familyId,
    leader_member_id: devotion.leaderId,
    scheduled_for: devotion.date,
    start_time: toDatabaseTime(devotion.time),
    bible_reading: devotion.bibleReading,
    topic: devotion.topic,
    notes: devotion.notes,
    status: devotion.status
  }));

  if (devotionRows.length > 0) {
    const { error: devotionError } = await client.from("devotion_schedule").upsert(devotionRows, { onConflict: "id" });

    if (devotionError) {
      throw devotionError;
    }
  }

  const mealRows = workspace.meals.map((meal) => ({
    id: meal.id,
    family_id: familyId,
    scheduled_for: meal.date,
    title: meal.title,
    cook_member_id: meal.cookId,
    ingredients: meal.ingredients,
    notes: meal.notes,
    status: meal.status
  }));

  if (mealRows.length > 0) {
    const { error: mealError } = await client.from("meals").upsert(mealRows, { onConflict: "id" });

    if (mealError) {
      throw mealError;
    }
  }
}

async function replayMutation(
  mutation: QueuedMutation,
  workspace: WorkspaceState,
  _context: FamilyContext
): Promise<"applied" | "deferred"> {
  if (mutationNeedsPlanningSync(mutation.type)) {
    return "deferred";
  }

  const client = requireSupabase();
  const familyId = getWorkspaceFamilyId(workspace);

  switch (mutation.type) {
    case "duty:update-status": {
      const assignmentId = asString(mutation.payload.assignmentId);
      const assignment = workspace.dutyAssignments.find((item) => item.id === assignmentId);

      if (!assignment) {
        return "applied";
      }

      const { error } = await client
        .from("duty_assignments")
        .update({
          assigned_member_id: assignment.assignedTo,
          scheduled_member_id: assignment.scheduledAssigneeId,
          assignment_source: assignment.assignmentSource,
          override_note: assignment.overrideNote,
          status: assignment.status,
          completed_at: assignment.completedAt
        })
        .eq("id", assignmentId)
        .eq("family_id", familyId);

      if (error) {
        throw error;
      }

      return "applied";
    }
    case "shopping:add": {
      const itemId = asString(mutation.payload.itemId);
      const item = workspace.shoppingItems.find((entry) => entry.id === itemId);

      if (!item) {
        return "applied";
      }

      const { error } = await client.from("shopping_items").upsert(
        {
          id: item.id,
          family_id: familyId,
          name: item.name,
          category: item.category,
          urgency: item.urgency,
          added_by_member_id: item.addedById,
          checked: item.checked,
          checked_at: item.checkedAt
        },
        { onConflict: "id" }
      );

      if (error) {
        throw error;
      }

      return "applied";
    }
    case "shopping:toggle": {
      const itemId = asString(mutation.payload.itemId);
      const item = workspace.shoppingItems.find((entry) => entry.id === itemId);

      if (!item) {
        return "applied";
      }

      const { error } = await client
        .from("shopping_items")
        .update({
          checked: item.checked,
          checked_at: item.checkedAt
        })
        .eq("id", item.id)
        .eq("family_id", familyId);

      if (error) {
        throw error;
      }

      return "applied";
    }
    case "meal:update-cook": {
      const mealId = asString(mutation.payload.mealId);
      const meal = workspace.meals.find((entry) => entry.id === mealId);

      if (!meal) {
        return "applied";
      }

      const { error } = await client
        .from("meals")
        .update({
          cook_member_id: meal.cookId
        })
        .eq("id", meal.id)
        .eq("family_id", familyId);

      if (error) {
        throw error;
      }

      return "applied";
    }
    case "devotion:update": {
      const devotionId = asString(mutation.payload.devotionId);
      const devotion = workspace.devotionAssignments.find((entry) => entry.id === devotionId);

      if (!devotion) {
        return "applied";
      }

      const { error } = await client
        .from("devotion_schedule")
        .update({
          leader_member_id: devotion.leaderId,
          bible_reading: devotion.bibleReading,
          topic: devotion.topic,
          notes: devotion.notes
        })
        .eq("id", devotion.id)
        .eq("family_id", familyId);

      if (error) {
        throw error;
      }

      return "applied";
    }
    case "request:create": {
      const requestId = asString(mutation.payload.requestId);
      const request = workspace.changeRequests.find((entry) => entry.id === requestId);

      if (!request) {
        return "applied";
      }

      const { error } = await client.from("change_requests").upsert(
        {
          id: request.id,
          family_id: request.familyId,
          requested_by_member_id: request.requestedById,
          requested_for_member_id: request.requestedForMemberId,
          request_type: request.type,
          target_type: request.targetType,
          target_id: request.targetId,
          title: request.title,
          details: request.details,
          proposed_changes: request.proposedChanges,
          status: request.status,
          reviewed_by_member_id: request.reviewedById,
          reviewed_at: request.reviewedAt,
          resolution_note: request.resolutionNote
        },
        { onConflict: "id" }
      );

      if (error) {
        throw error;
      }

      return "applied";
    }
    case "request:review": {
      const requestId = asString(mutation.payload.requestId);
      const request = workspace.changeRequests.find((entry) => entry.id === requestId);

      if (!request) {
        return "applied";
      }

      const { error } = await client
        .from("change_requests")
        .update({
          status: request.status,
          reviewed_by_member_id: request.reviewedById,
          reviewed_at: request.reviewedAt,
          resolution_note: request.resolutionNote
        })
        .eq("id", request.id)
        .eq("family_id", familyId);

      if (error) {
        throw error;
      }

      return "applied";
    }
    case "settings:update-reminder": {
      const { error } = await client.from("settings").upsert({
        family_id: familyId,
        reminder_settings: workspace.settings.reminderSettings
      });

      if (error) {
        throw error;
      }

      return "applied";
    }
    case "settings:update-devotion-skip": {
      const { error } = await client.from("settings").upsert({
        family_id: familyId,
        devotion_skip_weekdays: workspace.settings.devotionSkipWeekdays,
        devotion_time: toDatabaseTime(workspace.settings.devotionTime)
      });

      if (error) {
        throw error;
      }

      return "applied";
    }
    case "member:update-notifications": {
      const memberId = asString(mutation.payload.memberId);
      const member = workspace.members.find((entry) => entry.id === memberId);

      if (!member) {
        return "applied";
      }

      const { error } = await client
        .from("family_members")
        .update({
          notification_preferences: member.notificationPreferences
        })
        .eq("id", member.id)
        .eq("family_id", familyId);

      if (error) {
        throw error;
      }

      return "applied";
    }
    case "member:role": {
      const memberId = asString(mutation.payload.memberId);
      const member = workspace.members.find((entry) => entry.id === memberId);

      if (!member) {
        return "applied";
      }

      const { error } = await client
        .from("family_members")
        .update({
          role: member.role
        })
        .eq("id", member.id)
        .eq("family_id", familyId);

      if (error) {
        throw error;
      }

      return "applied";
    }
    case "member:add": {
      const name = asString(mutation.payload.name).trim();
      const email = asString(mutation.payload.email).trim().toLowerCase();
      const role = normalizeRole(mutation.payload.role);

      if (!name || !email) {
        return "applied";
      }

      const { data: existingProfile, error: existingProfileError } = await client
        .from("user_profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingProfileError) {
        throw existingProfileError;
      }

      let profileId = asString(existingProfile?.id);

      if (!profileId) {
        const { data: newProfile, error: insertProfileError } = await client
          .from("user_profiles")
          .insert({
            email,
            display_name: name,
            short_name: toShortName(name),
            avatar_seed: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
            avatar_tone: "#688d73"
          })
          .select("id")
          .single();

        if (insertProfileError) {
          throw insertProfileError;
        }

        profileId = asString(newProfile?.id);
      }

      const { error: memberError } = await client.from("family_members").upsert(
        {
          family_id: familyId,
          profile_id: profileId,
          role,
          status: "active"
        },
        {
          onConflict: "family_id,profile_id"
        }
      );

      if (memberError) {
        throw memberError;
      }

      return "applied";
    }
    default: {
      throw new Error(`Unsupported queued mutation: ${mutation.type}`);
    }
  }
}

export async function replaySupabaseQueuedMutations(
  mutations: QueuedMutation[],
  workspace: WorkspaceState
): Promise<SupabaseReplayResult> {
  if (mutations.length === 0) {
    return {
      appliedMutationIds: [],
      failedMutations: []
    };
  }

  const context = await resolveActiveFamilyContext();
  const appliedMutationIds: string[] = [];
  const failedMutations: SupabaseReplayFailure[] = [];
  const deferredMutationIds: string[] = [];

  for (const mutation of mutations) {
    try {
      const result = await replayMutation(mutation, workspace, context);

      if (result === "deferred") {
        deferredMutationIds.push(mutation.id);
      } else {
        appliedMutationIds.push(mutation.id);
      }
    } catch (error) {
      failedMutations.push({
        mutationId: mutation.id,
        message: stringifyError(error)
      });
    }
  }

  if (deferredMutationIds.length > 0) {
    try {
      await syncComplexPlanningSnapshot(workspace, context);
      appliedMutationIds.push(...deferredMutationIds);
    } catch (error) {
      const message = stringifyError(error);
      deferredMutationIds.forEach((mutationId) => {
        failedMutations.push({
          mutationId,
          message
        });
      });
    }
  }

  return {
    appliedMutationIds,
    failedMutations
  };
}
