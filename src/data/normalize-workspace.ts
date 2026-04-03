import type {
  AuditLogRecord,
  ChangeRequestRecord,
  CompletionLog,
  DevotionAssignment,
  DutyAssignment,
  DutyTemplate,
  Family,
  MealPlan,
  NotificationPreferences,
  NotificationRecord,
  QueuedMutation,
  SessionState,
  ShoppingItem,
  UserProfile,
  WorkspaceSettings,
  WorkspaceState
} from "@/data/types";
import { defaultWorkspaceSettings } from "@/data/seed";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asArray<T>(value: unknown, mapItem: (item: unknown, index: number) => T): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(mapItem);
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((chunk) => chunk[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const source = isRecord(value) ? value : {};

  return {
    browser: asBoolean(source.browser, true),
    stickyCards: asBoolean(source.stickyCards, true),
    devotionAlerts: asBoolean(source.devotionAlerts, true),
    mealAlerts: asBoolean(source.mealAlerts, true),
    dutyAlerts: asBoolean(source.dutyAlerts, true),
    quietHoursEnabled: asBoolean(source.quietHoursEnabled, true),
    quietHoursStart: asString(source.quietHoursStart, "22:00"),
    quietHoursEnd: asString(source.quietHoursEnd, "06:00")
  };
}

function normalizeFamily(value: unknown): Family | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: asString(value.id),
    name: asString(value.name, "Family"),
    timezone: asString(value.timezone, "Africa/Nairobi"),
    inviteCode: asString(value.inviteCode, "FAMT-0000"),
    motto: asString(value.motto, ""),
    devotionRhythm: asString(value.devotionRhythm, "Evening circle"),
    createdAt: asString(value.createdAt, new Date().toISOString())
  };
}

function normalizeMember(value: unknown): UserProfile {
  const source = isRecord(value) ? value : {};
  const displayName = asString(source.displayName, "Family member");
  const id = asString(source.id, `member-${displayName.toLowerCase().replace(/\s+/g, "-")}`);

  return {
    id,
    familyId: source.familyId === null ? null : asString(source.familyId),
    email: asString(source.email),
    displayName,
    shortName: asString(source.shortName, initialsFromName(displayName)),
    avatarTone: asString(source.avatarTone, "#6b7a69"),
    avatarSeed: asString(source.avatarSeed, `${displayName.toLowerCase().replace(/\s+/g, "-")}-${id}`),
    role:
      source.role === "parent" || source.role === "co-admin" || source.role === "member"
        ? source.role
        : "member",
    notificationPreferences: normalizeNotificationPreferences(source.notificationPreferences)
  };
}

function normalizeDutyTemplate(value: unknown): DutyTemplate {
  const source = isRecord(value) ? value : {};

  return {
    id: asString(source.id),
    familyId: asString(source.familyId),
    title: asString(source.title, "Duty"),
    description: asString(source.description),
    category:
      source.category === "cooking" ||
      source.category === "dishes" ||
      source.category === "cleaning" ||
      source.category === "laundry" ||
      source.category === "general"
        ? source.category
        : "general",
    dueTime: asString(source.dueTime, "18:00"),
    recurrence:
      source.recurrence === "daily" ||
      source.recurrence === "weekdays" ||
      source.recurrence === "weekly" ||
      source.recurrence === "custom"
        ? source.recurrence
        : "daily",
    startsOn: asString(source.startsOn, new Date().toISOString().slice(0, 10)),
    intervalDays: typeof source.intervalDays === "number" ? source.intervalDays : 1,
    urgency:
      source.urgency === "low" || source.urgency === "medium" || source.urgency === "high" || source.urgency === "critical"
        ? source.urgency
        : "medium",
    assignmentMode: source.assignmentMode === "fixed" ? "fixed" : "rotation",
    fixedAssigneeId: source.fixedAssigneeId === null ? null : asString(source.fixedAssigneeId) || null,
    participantMemberIds: asArray(source.participantMemberIds, (item) => asString(item)).filter(Boolean),
    rotationOrder: asArray(source.rotationOrder, (item) => asString(item)).filter(Boolean),
    rotationCursor: typeof source.rotationCursor === "number" ? source.rotationCursor : 0,
    lastAssignedMemberId: source.lastAssignedMemberId === null ? null : asString(source.lastAssignedMemberId) || null,
    lastAssignedAt: source.lastAssignedAt === null ? null : asString(source.lastAssignedAt) || null,
    pausedMemberIds: asArray(source.pausedMemberIds, (item) => asString(item)).filter(Boolean),
    skipWeekdays: asArray(source.skipWeekdays, (item) => (typeof item === "number" ? item : Number(item) || 0)).filter(
      (item) => item >= 0 && item <= 6
    ),
    skipDates: asArray(source.skipDates, (item) => asString(item)).filter(Boolean),
    active: source.active === undefined ? true : asBoolean(source.active, true)
  };
}

function normalizeDutyAssignment(value: unknown): DutyAssignment {
  const source = isRecord(value) ? value : {};

  return {
    id: asString(source.id),
    familyId: asString(source.familyId),
    templateId: asString(source.templateId),
    title: asString(source.title, "Duty"),
    description: asString(source.description),
    assignedTo: asString(source.assignedTo),
    scheduledAssigneeId: asString(source.scheduledAssigneeId, asString(source.assignedTo)),
    assignmentSource:
      source.assignmentSource === "temporary-cover" || source.assignmentSource === "rotation-shift"
        ? source.assignmentSource
        : source.assignmentSource === "fixed"
          ? "fixed"
          : "rotation",
    overrideNote: asString(source.overrideNote),
    dueAt: asString(source.dueAt, new Date().toISOString()),
    recurrence:
      source.recurrence === "daily" ||
      source.recurrence === "weekdays" ||
      source.recurrence === "weekly" ||
      source.recurrence === "custom"
        ? source.recurrence
        : "daily",
    urgency:
      source.urgency === "low" || source.urgency === "medium" || source.urgency === "high" || source.urgency === "critical"
        ? source.urgency
        : "medium",
    status: source.status === "done" ? "done" : "pending",
    completedAt: source.completedAt === null ? null : asString(source.completedAt) || null
  };
}

function normalizeDevotionAssignment(value: unknown): DevotionAssignment {
  const source = isRecord(value) ? value : {};

  return {
    id: asString(source.id),
    familyId: asString(source.familyId),
    date: asString(source.date, new Date().toISOString().slice(0, 10)),
    time: asString(source.time, "20:00"),
    leaderId: asString(source.leaderId),
    bibleReading: asString(source.bibleReading),
    topic: asString(source.topic, "Family devotion"),
    notes: asString(source.notes),
    status: source.status === "done" ? "done" : "planned"
  };
}

function normalizeMealPlan(value: unknown): MealPlan {
  const source = isRecord(value) ? value : {};

  return {
    id: asString(source.id),
    familyId: asString(source.familyId),
    date: asString(source.date, new Date().toISOString().slice(0, 10)),
    title: asString(source.title, "Meal"),
    cookId: asString(source.cookId),
    ingredients: asArray(source.ingredients, (item) => asString(item)).filter(Boolean),
    notes: asString(source.notes),
    status: source.status === "done" ? "done" : "planned"
  };
}

function normalizeShoppingItem(value: unknown): ShoppingItem {
  const source = isRecord(value) ? value : {};

  return {
    id: asString(source.id),
    familyId: asString(source.familyId),
    name: asString(source.name, "Item"),
    category: asString(source.category, "General"),
    urgency:
      source.urgency === "low" || source.urgency === "medium" || source.urgency === "high" || source.urgency === "critical"
        ? source.urgency
        : "medium",
    addedById: asString(source.addedById),
    createdAt: asString(source.createdAt, new Date().toISOString()),
    checked: asBoolean(source.checked, false),
    checkedAt: source.checkedAt === null ? null : asString(source.checkedAt) || null
  };
}

function normalizeNotification(value: unknown): NotificationRecord {
  const source = isRecord(value) ? value : {};

  return {
    id: asString(source.id),
    familyId: asString(source.familyId),
    title: asString(source.title),
    body: asString(source.body),
    severity: source.severity === "urgent" || source.severity === "important" ? source.severity : "gentle",
    channel: source.channel === "push" || source.channel === "browser" ? source.channel : "in-app",
    createdAt: asString(source.createdAt, new Date().toISOString()),
    readBy: asArray(source.readBy, (item) => asString(item)).filter(Boolean),
    source: source.source === "manual" ? "manual" : "system"
  };
}

function normalizeCompletionLog(value: unknown): CompletionLog {
  const source = isRecord(value) ? value : {};

  return {
    id: asString(source.id),
    familyId: asString(source.familyId),
    assignmentType: source.assignmentType === "meal" || source.assignmentType === "devotion" ? source.assignmentType : "duty",
    assignmentId: asString(source.assignmentId),
    memberId: asString(source.memberId),
    completedAt: asString(source.completedAt, new Date().toISOString()),
    status: source.status === "missed" ? "missed" : "completed"
  };
}

function normalizeChangeRequest(value: unknown): ChangeRequestRecord {
  const source = isRecord(value) ? value : {};

  return {
    id: asString(source.id),
    familyId: asString(source.familyId),
    type:
      source.type === "meal-reassign" ||
      source.type === "devotion-reassign" ||
      source.type === "schedule-change"
        ? source.type
        : "duty-swap",
    targetType:
      source.targetType === "duty-template" ||
      source.targetType === "duty-assignment" ||
      source.targetType === "devotion" ||
      source.targetType === "meal" ||
      source.targetType === "shopping-item" ||
      source.targetType === "member" ||
      source.targetType === "settings" ||
      source.targetType === "change-request" ||
      source.targetType === "schedule"
        ? source.targetType
        : "schedule",
    targetId: source.targetId === null ? null : asString(source.targetId) || null,
    requestedById: asString(source.requestedById),
    requestedForMemberId: source.requestedForMemberId === null ? null : asString(source.requestedForMemberId) || null,
    title: asString(source.title),
    details: asString(source.details),
    proposedChanges: isRecord(source.proposedChanges) ? source.proposedChanges : {},
    status: source.status === "approved" || source.status === "rejected" ? source.status : "pending",
    reviewedById: source.reviewedById === null ? null : asString(source.reviewedById) || null,
    reviewedAt: source.reviewedAt === null ? null : asString(source.reviewedAt) || null,
    resolutionNote: asString(source.resolutionNote),
    createdAt: asString(source.createdAt, new Date().toISOString())
  };
}

function normalizeAuditLog(value: unknown): AuditLogRecord {
  const source = isRecord(value) ? value : {};

  return {
    id: asString(source.id),
    familyId: asString(source.familyId),
    entityType:
      source.entityType === "duty-template" ||
      source.entityType === "duty-assignment" ||
      source.entityType === "devotion" ||
      source.entityType === "meal" ||
      source.entityType === "shopping-item" ||
      source.entityType === "member" ||
      source.entityType === "settings" ||
      source.entityType === "change-request" ||
      source.entityType === "schedule"
        ? source.entityType
        : "settings",
    entityId: source.entityId === null ? null : asString(source.entityId) || null,
    action:
      source.action === "create" ||
      source.action === "edit" ||
      source.action === "delete" ||
      source.action === "archive" ||
      source.action === "reassign" ||
      source.action === "complete" ||
      source.action === "reopen" ||
      source.action === "approve" ||
      source.action === "reject" ||
      source.action === "role-change" ||
      source.action === "settings-update" ||
      source.action === "generate" ||
      source.action === "request"
        ? source.action
        : "edit",
    actorId: source.actorId === null ? null : asString(source.actorId) || null,
    actorRole:
      source.actorRole === "parent" || source.actorRole === "co-admin" || source.actorRole === "member"
        ? source.actorRole
        : "system",
    summary: asString(source.summary),
    oldValue: isRecord(source.oldValue) ? source.oldValue : null,
    newValue: isRecord(source.newValue) ? source.newValue : null,
    createdAt: asString(source.createdAt, new Date().toISOString())
  };
}

function normalizeQueuedMutation(value: unknown, index: number): QueuedMutation {
  const source = isRecord(value) ? value : {};

  return {
    id: asString(source.id, `mutation-${index}`),
    type: asString(source.type, "unknown"),
    createdAt: asString(source.createdAt, new Date().toISOString()),
    payload: isRecord(source.payload) ? source.payload : {}
  };
}

function normalizeSession(value: unknown): SessionState {
  const source = isRecord(value) ? value : {};

  return {
    userId: source.userId === null ? null : asString(source.userId) || null,
    onboardingComplete: asBoolean(source.onboardingComplete, false),
    authMode: source.authMode === "supabase" ? "supabase" : "demo",
    lastSeenAt: source.lastSeenAt === null ? null : asString(source.lastSeenAt) || null
  };
}

function normalizeWorkspaceSettings(value: unknown): WorkspaceSettings {
  const defaults = defaultWorkspaceSettings();
  const source = isRecord(value) ? value : {};
  const reminderSettingsSource = isRecord(source.reminderSettings) ? source.reminderSettings : {};

  return {
    reminderSettings: {
      dueSoonMinutes:
        typeof reminderSettingsSource.dueSoonMinutes === "number"
          ? reminderSettingsSource.dueSoonMinutes
          : defaults.reminderSettings.dueSoonMinutes,
      upcomingWindowHours:
        typeof reminderSettingsSource.upcomingWindowHours === "number"
          ? reminderSettingsSource.upcomingWindowHours
          : defaults.reminderSettings.upcomingWindowHours,
      escalationMinutes:
        typeof reminderSettingsSource.escalationMinutes === "number"
          ? reminderSettingsSource.escalationMinutes
          : defaults.reminderSettings.escalationMinutes,
      browserNotifications: asBoolean(
        reminderSettingsSource.browserNotifications,
        defaults.reminderSettings.browserNotifications
      ),
      stickyOverdue: asBoolean(reminderSettingsSource.stickyOverdue, defaults.reminderSettings.stickyOverdue),
      badgeCounts: asBoolean(reminderSettingsSource.badgeCounts, defaults.reminderSettings.badgeCounts)
    },
    shoppingCategories: asArray(source.shoppingCategories, (item) => asString(item)).filter(Boolean).length
      ? asArray(source.shoppingCategories, (item) => asString(item)).filter(Boolean)
      : defaults.shoppingCategories,
    mealFocus: asString(source.mealFocus, defaults.mealFocus),
    devotionTime: asString(source.devotionTime, defaults.devotionTime),
    devotionSkipWeekdays: Array.isArray(source.devotionSkipWeekdays)
      ? asArray(source.devotionSkipWeekdays, (item) => (typeof item === "number" ? item : Number(item) || 0)).filter(
          (item) => item >= 0 && item <= 6
        )
      : defaults.devotionSkipWeekdays
  };
}

export function normalizeWorkspaceState(value: unknown): WorkspaceState | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    family: normalizeFamily(value.family),
    members: asArray(value.members, (item) => normalizeMember(item)),
    dutyTemplates: asArray(value.dutyTemplates, (item) => normalizeDutyTemplate(item)),
    dutyAssignments: asArray(value.dutyAssignments, (item) => normalizeDutyAssignment(item)),
    devotionAssignments: asArray(value.devotionAssignments, (item) => normalizeDevotionAssignment(item)),
    meals: asArray(value.meals, (item) => normalizeMealPlan(item)),
    shoppingItems: asArray(value.shoppingItems, (item) => normalizeShoppingItem(item)),
    notifications: asArray(value.notifications, (item) => normalizeNotification(item)),
    completionLogs: asArray(value.completionLogs, (item) => normalizeCompletionLog(item)),
    changeRequests: asArray(value.changeRequests, (item) => normalizeChangeRequest(item)),
    auditLogs: asArray(value.auditLogs, (item) => normalizeAuditLog(item)),
    settings: normalizeWorkspaceSettings(value.settings),
    queuedMutations: asArray(value.queuedMutations, (item, index) => normalizeQueuedMutation(item, index)),
    readReminderIds: asArray(value.readReminderIds, (item) => asString(item)).filter(Boolean),
    browserPromptedIds: asArray(value.browserPromptedIds, (item) => asString(item)).filter(Boolean),
    session: normalizeSession(value.session)
  };
}
