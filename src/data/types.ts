export type FamilyRole = "parent" | "co-admin" | "member";
export type DutyCategory = "cooking" | "dishes" | "cleaning" | "laundry" | "general";
export type DutyRecurrence = "daily" | "weekdays" | "weekly" | "custom";
export type DutyAssignmentMode = "rotation" | "fixed";
export type DutyOverrideMode = "temporary-cover" | "rotation-shift";
export type UrgencyLevel = "low" | "medium" | "high" | "critical";
export type DutyStatus = "pending" | "done";
export type ReminderState = "upcoming" | "due-soon" | "overdue";
export type NotificationLifecycleState = "scheduled" | "upcoming" | "due" | "overdue" | "completed";
export type ReminderSeverity = "gentle" | "important" | "urgent";
export type AssignmentKind = "duty" | "devotion" | "meal";
export type NotificationChannel = "in-app" | "browser" | "push";
export type ReminderPreferenceChannel = "duty" | "devotion" | "meal";
export type ChangeRequestType = "duty-swap" | "meal-reassign" | "devotion-reassign" | "schedule-change";
export type ChangeRequestStatus = "pending" | "approved" | "rejected";
export type AuditEntityType =
  | "duty-template"
  | "duty-assignment"
  | "devotion"
  | "meal"
  | "shopping-item"
  | "member"
  | "settings"
  | "change-request"
  | "schedule";
export type AuditAction =
  | "create"
  | "edit"
  | "delete"
  | "archive"
  | "reassign"
  | "complete"
  | "reopen"
  | "approve"
  | "reject"
  | "role-change"
  | "settings-update"
  | "generate"
  | "request";

export interface NotificationPreferences {
  browser: boolean;
  stickyCards: boolean;
  devotionAlerts: boolean;
  mealAlerts: boolean;
  dutyAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface Family {
  id: string;
  name: string;
  timezone: string;
  inviteCode: string;
  motto: string;
  devotionRhythm: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  familyId: string | null;
  email: string;
  displayName: string;
  shortName: string;
  avatarTone: string;
  avatarSeed: string;
  role: FamilyRole;
  notificationPreferences: NotificationPreferences;
}

export interface DutyTemplate {
  id: string;
  familyId: string;
  title: string;
  description: string;
  category: DutyCategory;
  dueTime: string;
  recurrence: DutyRecurrence;
  startsOn: string;
  intervalDays: number;
  urgency: UrgencyLevel;
  assignmentMode: DutyAssignmentMode;
  fixedAssigneeId: string | null;
  participantMemberIds: string[];
  rotationOrder: string[];
  rotationCursor: number;
  lastAssignedMemberId: string | null;
  lastAssignedAt: string | null;
  pausedMemberIds: string[];
  skipWeekdays: number[];
  skipDates: string[];
  active: boolean;
}

export interface DutyAssignment {
  id: string;
  familyId: string;
  templateId: string;
  title: string;
  description: string;
  assignedTo: string;
  scheduledAssigneeId: string;
  assignmentSource: "rotation" | "fixed" | DutyOverrideMode;
  overrideNote: string;
  dueAt: string;
  recurrence: DutyRecurrence;
  urgency: UrgencyLevel;
  status: DutyStatus;
  completedAt: string | null;
}

export interface DevotionAssignment {
  id: string;
  familyId: string;
  date: string;
  time: string;
  leaderId: string;
  bibleReading: string;
  topic: string;
  notes: string;
  status: "planned" | "done";
}

export interface MealPlan {
  id: string;
  familyId: string;
  date: string;
  title: string;
  cookId: string;
  ingredients: string[];
  notes: string;
  status: "planned" | "done";
}

export interface ShoppingItem {
  id: string;
  familyId: string;
  name: string;
  category: string;
  urgency: UrgencyLevel;
  addedById: string;
  createdAt: string;
  checked: boolean;
  checkedAt: string | null;
}

export interface NotificationRecord {
  id: string;
  familyId: string;
  title: string;
  body: string;
  severity: ReminderSeverity;
  channel: NotificationChannel;
  createdAt: string;
  readBy: string[];
  source: "system" | "manual";
}

export interface CompletionLog {
  id: string;
  familyId: string;
  assignmentType: AssignmentKind;
  assignmentId: string;
  memberId: string;
  completedAt: string;
  status: "completed" | "missed";
}

export interface ChangeRequestRecord {
  id: string;
  familyId: string;
  type: ChangeRequestType;
  targetType: AuditEntityType;
  targetId: string | null;
  requestedById: string;
  requestedForMemberId: string | null;
  title: string;
  details: string;
  proposedChanges: Record<string, unknown>;
  status: ChangeRequestStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  resolutionNote: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  familyId: string;
  entityType: AuditEntityType;
  entityId: string | null;
  action: AuditAction;
  actorId: string | null;
  actorRole: FamilyRole | "system";
  summary: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
}

export interface ReminderSettings {
  dueSoonMinutes: number;
  upcomingWindowHours: number;
  escalationMinutes: number;
  browserNotifications: boolean;
  stickyOverdue: boolean;
  badgeCounts: boolean;
}

export interface WorkspaceSettings {
  reminderSettings: ReminderSettings;
  shoppingCategories: string[];
  mealFocus: string;
  devotionTime: string;
  devotionSkipWeekdays: number[];
}

export interface QueuedMutation {
  id: string;
  type: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface SessionState {
  userId: string | null;
  onboardingComplete: boolean;
  authMode: "demo" | "supabase";
  lastSeenAt: string | null;
}

export interface WorkspaceState {
  family: Family | null;
  members: UserProfile[];
  dutyTemplates: DutyTemplate[];
  dutyAssignments: DutyAssignment[];
  devotionAssignments: DevotionAssignment[];
  meals: MealPlan[];
  shoppingItems: ShoppingItem[];
  notifications: NotificationRecord[];
  completionLogs: CompletionLog[];
  changeRequests: ChangeRequestRecord[];
  auditLogs: AuditLogRecord[];
  settings: WorkspaceSettings;
  queuedMutations: QueuedMutation[];
  readReminderIds: string[];
  browserPromptedIds: string[];
  session: SessionState;
}

export interface ReminderItem {
  id: string;
  kind: AssignmentKind;
  relatedId: string;
  assigneeId: string;
  title: string;
  body: string;
  dueAt: string;
  state: ReminderState;
  severity: ReminderSeverity;
  sticky: boolean;
  read: boolean;
  actionableLabel: string;
}

export interface DeviceNotificationTask {
  id: string;
  kind: AssignmentKind;
  relatedId: string;
  familyId: string;
  memberId: string;
  memberName: string;
  title: string;
  summary: string;
  description: string;
  dueAt: string;
  urgency: UrgencyLevel;
  url: string;
  preferenceChannel: ReminderPreferenceChannel;
}

export interface DeviceNotificationSchedule {
  familyId: string;
  memberId: string;
  syncedAt: string;
  settings: ReminderSettings;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  tasks: DeviceNotificationTask[];
}

export interface NotificationDeliveryRecord {
  taskId: string;
  state: NotificationLifecycleState;
  sentAt: string;
  nextEligibleAt: string | null;
  deliveryCount: number;
  tag: string;
}

export interface EvaluatedNotification {
  id: string;
  taskId: string;
  title: string;
  body: string;
  state: NotificationLifecycleState;
  severity: ReminderSeverity;
  tag: string;
  url: string;
  dueAt: string;
  repeatAfterMinutes: number | null;
  deliveryCount: number;
}

export interface PushSubscriptionRecord {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type ServiceWorkerMessage =
  | {
      type: "FAMTASTIC_SYNC_REMINDERS";
      payload: DeviceNotificationSchedule;
    }
  | {
      type: "FAMTASTIC_EVALUATE_REMINDERS";
      reason: "boot" | "foreground-tick" | "visibility" | "manual" | "permission-granted";
    }
  | {
      type: "FAMTASTIC_SHOW_TEST_NOTIFICATION";
      payload: {
        title: string;
        body: string;
        url: string;
      };
    }
  | {
      type: "FAMTASTIC_SHOW_EVENT_NOTIFICATION";
      payload: {
        title: string;
        body: string;
        url: string;
        tag?: string;
        requireInteraction?: boolean;
      };
    }
  | {
      type: "FAMTASTIC_CLEAR_SESSION";
    };

export interface AuthFormValues {
  name?: string;
  email: string;
  password: string;
}

export interface FamilySetupValues {
  familyName?: string;
  inviteCode?: string;
}
