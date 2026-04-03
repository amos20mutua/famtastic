import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  type ReactNode
} from "react";
import { addDays, formatISO, isSameDay, parseISO, set, startOfDay } from "date-fns";
import {
  createPendingMember,
  createSeedWorkspace,
  createStarterWorkspace,
  defaultWorkspaceSettings
} from "@/data/seed";
import type {
  AuditLogRecord,
  AuditEntityType,
  AuthFormValues,
  CompletionLog,
  ChangeRequestRecord,
  ChangeRequestType,
  DevotionAssignment,
  DutyAssignment,
  DutyOverrideMode,
  DutyTemplate,
  FamilyRole,
  FamilySetupValues,
  MealPlan,
  NotificationPreferences,
  NotificationRecord,
  ReminderItem,
  UrgencyLevel,
  UserProfile,
  WorkspaceState
} from "@/data/types";
import { isPushConfigured, isSupabaseConfigured, vapidPublicKey } from "@/lib/env";
import {
  clearReminderScheduleFromWorker,
  evaluateRemindersInWorker,
  registerReminderBackgroundChecks,
  showEventNotification,
  showNotificationPreview,
  subscribeToPushNotifications,
  syncReminderScheduleToWorker,
  unsubscribeFromPushNotifications
} from "@/lib/notification-client";
import {
  buildCompletionFeedbackCopy,
  buildNotificationPreviewCopy,
  buildReopenFeedbackCopy
} from "@/lib/notification-copy";
import { buildDeviceNotificationSchedule, buildMemberReminderItems } from "@/lib/notification-runtime";
import { buildReminderItems } from "@/lib/reminders";
import {
  assignTemplateOccurrence,
  getDutyParticipantIds,
  getOfficialAssignmentMemberId,
  getRotationCursorAfterMember,
  buildUpcomingOccurrenceDates,
  moveRotationMember,
  resetDutyRotation as resetDutyTemplateState
} from "@/lib/rotations";
import { clearWorkspaceState, loadWorkspaceState, saveWorkspaceState } from "@/lib/storage";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

interface AppStateContextValue {
  workspace: WorkspaceState | null;
  isHydrating: boolean;
  isOnline: boolean;
  syncState: "offline" | "syncing" | "synced";
  currentUser: UserProfile | null;
  familyMembers: UserProfile[];
  isAdmin: boolean;
  canManageSchedules: boolean;
  canManageMembers: boolean;
  canManageReminderRules: boolean;
  canReviewRequests: boolean;
  canViewAuditHistory: boolean;
  reminders: ReminderItem[];
  unreadReminders: ReminderItem[];
  visibleChangeRequests: ChangeRequestRecord[];
  todayDutyAssignments: DutyAssignment[];
  upcomingDutyAssignments: DutyAssignment[];
  todayDevotion: DevotionAssignment | null;
  nextDevotion: DevotionAssignment | null;
  todayMeal: MealPlan | null;
  installReady: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  canUsePushNotifications: boolean;
  pushNotificationsConfigured: boolean;
  pushSubscriptionEnabled: boolean;
  signIn: (values: AuthFormValues) => Promise<{ success: boolean; needsFamily: boolean; error?: string }>;
  signUp: (values: AuthFormValues) => Promise<{ success: boolean; needsFamily: boolean; error?: string }>;
  continueWithDemo: (memberId?: string) => void;
  logout: () => Promise<void>;
  createFamilyFromSetup: (values: FamilySetupValues) => { success: boolean; error?: string };
  joinFamilyFromInvite: (inviteCode: string) => { success: boolean; error?: string };
  markDutyComplete: (assignmentId: string) => void;
  addShoppingItem: (values: { name: string; category: string; urgency: UrgencyLevel }) => void;
  toggleShoppingItem: (itemId: string) => void;
  markReminderRead: (reminderId: string) => void;
  markAllRemindersRead: () => void;
  updateMealCook: (mealId: string, memberId: string) => void;
  updateDevotion: (
    devotionId: string,
    values: Partial<Pick<DevotionAssignment, "leaderId" | "bibleReading" | "topic" | "notes">>
  ) => void;
  updateReminderSettings: (values: Partial<WorkspaceState["settings"]["reminderSettings"]>) => Promise<void>;
  toggleDevotionSkipWeekday: (weekday: number) => Promise<void>;
  updateMemberNotifications: (memberId: string, patch: Partial<NotificationPreferences>) => void;
  updateMemberRole: (memberId: string, role: FamilyRole) => void;
  addFamilyMember: (values: { name: string; email: string; role: FamilyRole }) => void;
  updateDutyTemplateSchedule: (
    templateId: string,
    values: Partial<
      Pick<
        DutyTemplate,
        "assignmentMode" | "fixedAssigneeId" | "recurrence" | "intervalDays" | "startsOn" | "participantMemberIds" | "skipWeekdays" | "skipDates"
      >
    >
  ) => void;
  moveDutyRotationMember: (templateId: string, memberId: string, direction: "up" | "down") => void;
  toggleDutyRotationPause: (templateId: string, memberId: string) => void;
  toggleDutyTemplateParticipant: (templateId: string, memberId: string) => void;
  toggleDutyTemplateSkipWeekday: (templateId: string, weekday: number) => void;
  resetDutyTemplateRotation: (templateId: string) => void;
  overrideDutyAssignment: (
    assignmentId: string,
    values: { assigneeId: string; mode: DutyOverrideMode; note?: string }
  ) => void;
  generateNextWeek: () => void;
  submitChangeRequest: (values: {
    type: ChangeRequestType;
    targetType: AuditEntityType;
    targetId: string | null;
    title: string;
    details: string;
    requestedForMemberId?: string | null;
    proposedChanges?: Record<string, unknown>;
  }) => { success: boolean; error?: string };
  reviewChangeRequest: (requestId: string, decision: "approved" | "rejected", resolutionNote?: string) => void;
  requestBrowserNotifications: () => Promise<NotificationPermission | "unsupported">;
  sendTestNotification: () => Promise<boolean>;
  promptInstall: () => Promise<void>;
  resetDemoWorkspace: () => Promise<void>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);
const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function getInitialOnlineState() {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

function withQueuedMutation(
  workspace: WorkspaceState,
  type: string,
  payload: Record<string, unknown>,
  shouldQueue: boolean
) {
  if (!shouldQueue) {
    return workspace;
  }

  return {
    ...workspace,
    queuedMutations: [
      ...workspace.queuedMutations,
      {
        id: `mutation-${Date.now()}-${workspace.queuedMutations.length + 1}`,
        type,
        createdAt: new Date().toISOString(),
        payload
      }
    ]
  };
}

function buildDateAt(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
}

function isSkippedWeekday(weekday: number, skipWeekdays: number[]) {
  return skipWeekdays.includes(weekday);
}

function sameFamilyMembers(workspace: WorkspaceState) {
  if (!workspace.family) {
    return [];
  }

  return workspace.members.filter((member) => member.familyId === workspace.family?.id);
}

function isGovernanceRole(role: FamilyRole | null | undefined) {
  return role === "parent" || role === "co-admin";
}

function normalizeTemplateSchedule(
  template: DutyTemplate,
  members: UserProfile[],
  patch: Partial<
    Pick<
      DutyTemplate,
      "assignmentMode" | "fixedAssigneeId" | "recurrence" | "intervalDays" | "startsOn" | "participantMemberIds" | "skipWeekdays" | "skipDates"
    >
  > = {}
) {
  const memberIds = members.map((member) => member.id);
  const nextParticipantIds =
    patch.participantMemberIds && patch.participantMemberIds.length > 0
      ? patch.participantMemberIds.filter((memberId) => memberIds.includes(memberId))
      : template.participantMemberIds.length > 0
        ? template.participantMemberIds.filter((memberId) => memberIds.includes(memberId))
        : memberIds;
  const participantMemberIds = nextParticipantIds.length > 0 ? nextParticipantIds : memberIds;
  const rotationOrder = [...template.rotationOrder.filter((memberId) => participantMemberIds.includes(memberId))];

  participantMemberIds.forEach((memberId) => {
    if (!rotationOrder.includes(memberId)) {
      rotationOrder.push(memberId);
    }
  });

  const nextRecurrence = patch.recurrence ?? template.recurrence;
  const nextIntervalDays = Math.max(1, patch.intervalDays ?? template.intervalDays);
  const nextAssignmentMode = patch.assignmentMode ?? template.assignmentMode;
  const requestedFixedAssigneeId = patch.fixedAssigneeId ?? template.fixedAssigneeId;
  const fixedAssigneeId =
    requestedFixedAssigneeId && participantMemberIds.includes(requestedFixedAssigneeId)
      ? requestedFixedAssigneeId
      : participantMemberIds[0] ?? null;
  const skipWeekdays = [...new Set((patch.skipWeekdays ?? template.skipWeekdays).filter((day) => day >= 0 && day <= 6))].sort();
  const skipDates = [...new Set((patch.skipDates ?? template.skipDates).filter(Boolean))].sort();

  return {
    ...template,
    ...patch,
    recurrence: nextRecurrence,
    intervalDays: nextRecurrence === "weekly" ? Math.max(7, nextIntervalDays) : nextIntervalDays,
    startsOn: patch.startsOn ?? template.startsOn,
    assignmentMode: nextAssignmentMode,
    fixedAssigneeId: nextAssignmentMode === "fixed" ? fixedAssigneeId : null,
    participantMemberIds,
    rotationOrder,
    pausedMemberIds: template.pausedMemberIds.filter((memberId) => participantMemberIds.includes(memberId)),
    skipWeekdays,
    skipDates,
    rotationCursor: rotationOrder.length === 0 ? 0 : template.rotationCursor % rotationOrder.length
  };
}

function sortAssignmentsByDueAt(assignments: DutyAssignment[]) {
  return assignments.slice().sort((left, right) => parseISO(left.dueAt).getTime() - parseISO(right.dueAt).getTime());
}

function deriveTemplateFromAssignments(template: DutyTemplate, members: UserProfile[], assignments: DutyAssignment[]) {
  const normalizedTemplate = normalizeTemplateSchedule(template, members);

  if (normalizedTemplate.assignmentMode === "fixed") {
    return normalizedTemplate;
  }

  const latestAssignment = sortAssignmentsByDueAt(assignments).at(-1);
  const officialMemberId = latestAssignment ? getOfficialAssignmentMemberId(latestAssignment) : normalizedTemplate.lastAssignedMemberId;

  return {
    ...normalizedTemplate,
    rotationCursor: getRotationCursorAfterMember(normalizedTemplate, members, officialMemberId),
    lastAssignedMemberId: officialMemberId,
    lastAssignedAt: latestAssignment?.dueAt ?? normalizedTemplate.lastAssignedAt
  };
}

function generateFutureAssignmentsForTemplate(
  familyId: string,
  template: DutyTemplate,
  members: UserProfile[],
  existingAssignments: DutyAssignment[],
  startDate: Date,
  count: number
) {
  let nextTemplate = deriveTemplateFromAssignments(template, members, existingAssignments);
  const generatedAssignments: DutyAssignment[] = [];

  buildUpcomingOccurrenceDates(nextTemplate, startDate, count).forEach((targetDate) => {
    const dueAt = buildDateAt(targetDate, nextTemplate.dueTime);
    const duplicate = [...existingAssignments, ...generatedAssignments].some(
      (assignment) => assignment.templateId === nextTemplate.id && isSameDay(parseISO(assignment.dueAt), dueAt)
    );

    if (duplicate) {
      return;
    }

    const assignmentResult = assignTemplateOccurrence(nextTemplate, members, dueAt.toISOString());
    nextTemplate = assignmentResult.template;

    if (!assignmentResult.assigneeId || !assignmentResult.scheduledAssigneeId) {
      return;
    }

    generatedAssignments.push({
      id: `assignment-${nextTemplate.id}-${formatISO(targetDate, { representation: "date" })}`,
      familyId,
      templateId: nextTemplate.id,
      title: nextTemplate.title,
      description: nextTemplate.description,
      assignedTo: assignmentResult.assigneeId,
      scheduledAssigneeId: assignmentResult.scheduledAssigneeId,
      assignmentSource: assignmentResult.assignmentSource,
      overrideNote: "",
      dueAt: dueAt.toISOString(),
      recurrence: nextTemplate.recurrence,
      urgency: nextTemplate.urgency,
      status: "pending",
      completedAt: null
    });
  });

  return {
    template: nextTemplate,
    assignments: generatedAssignments
  };
}

function rebuildFutureAssignmentsForTemplate(
  workspace: WorkspaceState,
  template: DutyTemplate,
  preserveThroughDueAt?: string
) {
  if (!workspace.family) {
    return {
      template,
      assignments: workspace.dutyAssignments
    };
  }

  const members = sameFamilyMembers(workspace);
  const cutoff = preserveThroughDueAt ? parseISO(preserveThroughDueAt).getTime() : Date.now();
  const keepAssignments = workspace.dutyAssignments.filter((assignment) => {
    if (assignment.templateId !== template.id) {
      return true;
    }

    return assignment.status === "done" || parseISO(assignment.dueAt).getTime() <= cutoff;
  });
  const templateAssignments = keepAssignments.filter((assignment) => assignment.templateId === template.id);
  const removedFutureCount = workspace.dutyAssignments.filter(
    (assignment) => assignment.templateId === template.id && assignment.status === "pending" && parseISO(assignment.dueAt).getTime() > cutoff
  ).length;
  const latestRelevantDate = sortAssignmentsByDueAt(templateAssignments).at(-1);
  const generationStart = latestRelevantDate ? addDays(startOfDay(parseISO(latestRelevantDate.dueAt)), 1) : startOfDay(new Date());
  const generated = generateFutureAssignmentsForTemplate(
    workspace.family.id,
    template,
    members,
    templateAssignments,
    generationStart,
    Math.max(removedFutureCount, 7)
  );

  return {
    template: generated.template,
    assignments: sortAssignmentsByDueAt([...keepAssignments, ...generated.assignments])
  };
}

function generateFutureDevotions(
  familyId: string,
  members: UserProfile[],
  devotionTime: string,
  skipWeekdays: number[],
  existingDevotions: DevotionAssignment[],
  count: number
) {
  const keptDevotions = existingDevotions
    .slice()
    .sort((left, right) => parseISO(left.date).getTime() - parseISO(right.date).getTime());

  const generatedDevotions: DevotionAssignment[] = [];
  const latestDevotion = keptDevotions.at(-1) ?? null;
  const fallbackStart = startOfDay(new Date());
  let targetDate = latestDevotion ? addDays(startOfDay(parseISO(latestDevotion.date)), 1) : fallbackStart;
  let nextLeaderIndex = 0;

  if (latestDevotion) {
    const lastLeaderIndex = members.findIndex((member) => member.id === latestDevotion.leaderId);
    nextLeaderIndex = lastLeaderIndex >= 0 ? (lastLeaderIndex + 1) % members.length : 0;
  }

  while (generatedDevotions.length < count) {
    if (!isSkippedWeekday(targetDate.getDay(), skipWeekdays)) {
      const dateKey = formatISO(targetDate, { representation: "date" });
      const duplicate = [...keptDevotions, ...generatedDevotions].some((devotion) => devotion.date === dateKey);

      if (!duplicate) {
        const leader = members[nextLeaderIndex % members.length];
        const sequence = generatedDevotions.length;

        generatedDevotions.push({
          id: `devotion-${dateKey}`,
          familyId,
          date: dateKey,
          time: devotionTime,
          leaderId: leader.id,
          bibleReading: ["John 15:1-8", "James 1:2-8", "Romans 12:9-18", "Psalm 23", "Hebrews 10:19-25"][sequence % 5],
          topic: ["Abide in the Vine", "Wisdom in Trials", "Love in Action", "The Shepherd's Care", "Stir One Another Up"][sequence % 5],
          notes: "Keep the rhythm simple and leave room for one shared prayer response.",
          status: "planned"
        });
        nextLeaderIndex = (nextLeaderIndex + 1) % members.length;
      }
    }

    targetDate = addDays(targetDate, 1);
  }

  return generatedDevotions;
}

function rebuildFutureDevotions(
  workspace: WorkspaceState,
  values?: Partial<Pick<WorkspaceState["settings"], "devotionTime" | "devotionSkipWeekdays">>
) {
  if (!workspace.family) {
    return workspace.devotionAssignments;
  }

  const members = sameFamilyMembers(workspace);

  if (members.length === 0) {
    return workspace.devotionAssignments;
  }

  const nextSettings = {
    devotionTime: values?.devotionTime ?? workspace.settings.devotionTime,
    devotionSkipWeekdays: values?.devotionSkipWeekdays ?? workspace.settings.devotionSkipWeekdays
  };
  const today = startOfDay(new Date());
  const preservedDevotions = workspace.devotionAssignments.filter((devotion) => {
    const devotionDate = parseISO(devotion.date);
    return devotion.status === "done" || devotionDate < today;
  });
  const futurePlannedCount = workspace.devotionAssignments.filter((devotion) => {
    const devotionDate = parseISO(devotion.date);
    return devotion.status !== "done" && devotionDate >= today;
  }).length;
  const generatedDevotions = generateFutureDevotions(
    workspace.family.id,
    members,
    nextSettings.devotionTime,
    nextSettings.devotionSkipWeekdays,
    preservedDevotions,
    Math.max(futurePlannedCount, 5)
  );

  return [...preservedDevotions, ...generatedDevotions].sort(
    (left, right) => parseISO(left.date).getTime() - parseISO(right.date).getTime()
  );
}

function generateRotatedWorkspace(workspace: WorkspaceState) {
  if (!workspace.family) {
    return workspace;
  }

  const familyId = workspace.family.id;
  const members = sameFamilyMembers(workspace);

  if (members.length === 0) {
    return workspace;
  }

  let futureAssignments = [...workspace.dutyAssignments];
  const futureTemplates = workspace.dutyTemplates.map((template) => {
    if (!template.active) {
      return template;
    }

    const normalizedTemplate = normalizeTemplateSchedule(template, members);
    const latestTemplateAssignment =
      futureAssignments
        .filter((assignment) => assignment.templateId === normalizedTemplate.id)
        .map((assignment) => parseISO(assignment.dueAt))
        .sort((left, right) => left.getTime() - right.getTime())
        .at(-1) ?? null;
    const generationStart = latestTemplateAssignment ? addDays(startOfDay(latestTemplateAssignment), 1) : startOfDay(new Date());
    const generated = generateFutureAssignmentsForTemplate(
      familyId,
      normalizedTemplate,
      members,
      futureAssignments.filter((assignment) => assignment.templateId === normalizedTemplate.id),
      generationStart,
      7
    );

    futureAssignments = sortAssignmentsByDueAt([...futureAssignments, ...generated.assignments]);

    return generated.template;
  });

  const futureDevotions = rebuildFutureDevotions(workspace);

  const futureMeals = [...workspace.meals];
  const latestMealDate =
    futureMeals
      .map((meal) => parseISO(meal.date))
      .sort((left, right) => left.getTime() - right.getTime())
      .at(-1) ?? new Date();

  const mealPresets = [
    { title: "Coconut bean curry", ingredients: ["Beans", "Coconut milk", "Tomatoes", "Onions"], notes: "Cook rice alongside the curry." },
    { title: "Lemon chicken tray bake", ingredients: ["Chicken", "Potatoes", "Lemons", "Garlic"], notes: "Marinate the chicken after lunch." },
    { title: "Beef pilau", ingredients: ["Rice", "Beef", "Pilau spice", "Onions"], notes: "Measure spices in advance." },
    { title: "Vegetable noodle bowl", ingredients: ["Noodles", "Cabbage", "Carrots", "Soy sauce"], notes: "Prep vegetables during the afternoon." },
    { title: "Tilapia with roast plantain", ingredients: ["Tilapia", "Plantain", "Lemons", "Oil"], notes: "Buy fish in the morning if needed." }
  ];

  for (let offset = 1; offset <= 5; offset += 1) {
    const targetDate = addDays(startOfDay(latestMealDate), offset);
    const duplicate = futureMeals.some((meal) => meal.date === formatISO(targetDate, { representation: "date" }));

    if (duplicate) {
      continue;
    }

    const mealPreset = mealPresets[(offset - 1) % mealPresets.length];
    const cook = members[(offset + 1) % members.length];

    futureMeals.push({
      id: `meal-${formatISO(targetDate, { representation: "date" })}`,
      familyId,
      date: formatISO(targetDate, { representation: "date" }),
      title: mealPreset.title,
      cookId: cook.id,
      ingredients: mealPreset.ingredients,
      notes: mealPreset.notes,
      status: "planned"
    });
  }

  return {
    ...workspace,
    dutyTemplates: futureTemplates,
    dutyAssignments: futureAssignments.sort((left, right) => parseISO(left.dueAt).getTime() - parseISO(right.dueAt).getTime()),
    devotionAssignments: futureDevotions,
    meals: futureMeals
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isOnline, setIsOnline] = useState(getInitialOnlineState);
  const [syncState, setSyncState] = useState<"offline" | "syncing" | "synced">("synced");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof Notification === "undefined") {
      return "unsupported";
    }

    return Notification.permission;
  });
  const [pushSubscriptionEnabled, setPushSubscriptionEnabled] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const persisted = await loadWorkspaceState();

        if (cancelled) {
          return;
        }

        setWorkspace(persisted ?? createSeedWorkspace());
      } catch {
        await clearWorkspaceState();

        if (cancelled) {
          return;
        }

        setWorkspace(createSeedWorkspace());
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workspace || isHydrating) {
      return;
    }

    const idleWindow = window as IdleWindow;
    let timeoutHandle: number | undefined;
    let idleHandle: number | undefined;

    const persistWorkspace = () => {
      void saveWorkspaceState(workspace);
    };

    timeoutHandle = window.setTimeout(() => {
      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(persistWorkspace, { timeout: 800 });
        return;
      }

      persistWorkspace();
    }, 180);

    return () => {
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }

      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
    };
  }, [workspace, isHydrating]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
      setSyncState("offline");
    }

    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  const tick = useEffectEvent(() => {
    setNow(new Date());
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      tick();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [tick]);

  const syncQueuedChanges = useEffectEvent(async () => {
    if (!workspace || workspace.queuedMutations.length === 0 || !isOnline) {
      return;
    }

    setSyncState("syncing");
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setWorkspace((current) =>
      current
        ? {
            ...current,
            queuedMutations: [],
            session: {
              ...current.session,
              lastSeenAt: new Date().toISOString()
            }
          }
        : current
    );
    setSyncState("synced");
  });

  useEffect(() => {
    if (!workspace) {
      return;
    }

    if (!isOnline) {
      setSyncState("offline");
      return;
    }

    if (workspace.queuedMutations.length > 0) {
      void syncQueuedChanges();
      return;
    }

    setSyncState("synced");
  }, [workspace, isOnline, syncQueuedChanges]);

  const currentUser = workspace?.members.find((member) => member.id === workspace.session.userId) ?? null;
  const familyMembers = workspace ? sameFamilyMembers(workspace) : [];
  const reminders = workspace ? buildReminderItems(workspace, now) : [];
  const memberReminders = currentUser ? buildMemberReminderItems(reminders, currentUser.id) : [];
  const unreadReminders = memberReminders.filter((reminder) => !reminder.read);
  const todayDutyAssignments =
    workspace?.dutyAssignments.filter(
      (assignment) =>
        assignment.status === "pending" &&
        (isSameDay(parseISO(assignment.dueAt), now) || parseISO(assignment.dueAt) < now)
    ) ?? [];
  const upcomingDutyAssignments =
    workspace?.dutyAssignments
      .filter(
        (assignment) =>
          assignment.status === "pending" &&
          parseISO(assignment.dueAt) > now &&
          !isSameDay(parseISO(assignment.dueAt), now)
      )
      .sort((left, right) => parseISO(left.dueAt).getTime() - parseISO(right.dueAt).getTime())
      .slice(0, 4) ?? [];
  const todayDevotion =
    workspace?.devotionAssignments.find((devotion) => devotion.date === formatISO(now, { representation: "date" })) ?? null;
  const nextDevotion =
    workspace?.devotionAssignments
      .filter((devotion) => parseISO(devotion.date) >= startOfDay(now))
      .sort((left, right) => left.date.localeCompare(right.date))[0] ?? null;
  const todayMeal =
    workspace?.meals.find((meal) => meal.date === formatISO(now, { representation: "date" })) ?? null;
  const isAdmin = currentUser?.role === "parent";
  const canManageSchedules = isGovernanceRole(currentUser?.role);
  const canManageMembers = currentUser?.role === "parent";
  const canManageReminderRules = currentUser?.role === "parent";
  const canReviewRequests = isGovernanceRole(currentUser?.role);
  const canViewAuditHistory = isGovernanceRole(currentUser?.role);
  const visibleChangeRequests =
    workspace?.changeRequests
      .filter((request) => (canReviewRequests ? true : request.requestedById === currentUser?.id))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)) ?? [];
  const canUsePushNotifications =
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(Notification.permission);
  }, []);

  const syncReminderRuntime = useEffectEvent(async () => {
    if (!workspace || !currentUser || !currentUser.familyId) {
      await clearReminderScheduleFromWorker();
      return;
    }

    const schedule = buildDeviceNotificationSchedule(workspace, currentUser);

    if (!schedule) {
      await clearReminderScheduleFromWorker();
      return;
    }

    await syncReminderScheduleToWorker(schedule);

    if (
      notificationPermission === "granted" &&
      workspace.settings.reminderSettings.browserNotifications &&
      currentUser.notificationPreferences.browser
    ) {
      await registerReminderBackgroundChecks();
    }
  });

  useEffect(() => {
    void syncReminderRuntime();
  }, [currentUser, notificationPermission, syncReminderRuntime, workspace]);

  const evaluateVisibleReminders = useEffectEvent(async (reason: "foreground-tick" | "visibility") => {
    if (
      notificationPermission !== "granted" ||
      !workspace?.settings.reminderSettings.browserNotifications ||
      !currentUser?.notificationPreferences.browser
    ) {
      return;
    }

    await evaluateRemindersInWorker(reason);
  });

  useEffect(() => {
    void evaluateVisibleReminders("foreground-tick");
  }, [currentUser?.id, evaluateVisibleReminders, notificationPermission, now, workspace?.settings.reminderSettings.browserNotifications]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void evaluateVisibleReminders("visibility");
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [evaluateVisibleReminders]);

  useEffect(() => {
    let cancelled = false;

    async function hydratePushSubscriptionState() {
      if (!canUsePushNotifications || notificationPermission !== "granted") {
        if (!cancelled) {
          setPushSubscriptionEnabled(false);
        }
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration().catch(() => null);
      const subscription = await registration?.pushManager.getSubscription().catch(() => null);

      if (!cancelled) {
        setPushSubscriptionEnabled(Boolean(subscription));
      }
    }

    void hydratePushSubscriptionState();

    return () => {
      cancelled = true;
    };
  }, [canUsePushNotifications, currentUser?.id, notificationPermission]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const overdueCount = memberReminders.filter((reminder) => reminder.state === "overdue").length;
    document.title = overdueCount > 0 ? `Famtastic (${overdueCount})` : "Famtastic";

    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };

    if (!workspace?.settings.reminderSettings.badgeCounts) {
      void nav.clearAppBadge?.();
      return;
    }

    if (overdueCount > 0) {
      void nav.setAppBadge?.(overdueCount);
      return;
    }

    void nav.clearAppBadge?.();
  }, [memberReminders, workspace?.settings.reminderSettings.badgeCounts]);

  function buildSystemNotification(
    familyId: string,
    values: {
      title: string;
      body: string;
      severity: "gentle" | "important" | "urgent";
    }
  ): NotificationRecord {
    return {
      id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      familyId,
      title: values.title,
      body: values.body,
      severity: values.severity,
      channel: "in-app" as const,
      createdAt: new Date().toISOString(),
      readBy: [],
      source: "system" as const
    };
  }

  function buildAuditLog(
    familyId: string,
    values: {
      entityType: AuditEntityType;
      entityId: string | null;
      action:
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
      summary: string;
      oldValue?: Record<string, unknown> | null;
      newValue?: Record<string, unknown> | null;
    }
  ): AuditLogRecord {
    const actorRole: AuditLogRecord["actorRole"] = currentUser?.role ?? "system";

    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      familyId,
      entityType: values.entityType,
      entityId: values.entityId,
      action: values.action,
      actorId: currentUser?.id ?? null,
      actorRole,
      summary: values.summary,
      oldValue: values.oldValue ?? null,
      newValue: values.newValue ?? null,
      createdAt: new Date().toISOString()
    };
  }

  function commitWorkspace(
    updater: (current: WorkspaceState) => WorkspaceState,
    mutation?: { type: string; payload: Record<string, unknown> }
  ) {
    setWorkspace((current) => {
      if (!current) {
        return current;
      }

      const updated = updater(current);
      return mutation ? withQueuedMutation(updated, mutation.type, mutation.payload, !isOnline) : updated;
    });
  }

  async function signIn(values: AuthFormValues) {
    if (isSupabaseConfigured) {
      try {
        const { signInWithSupabase } = await import("@/data/repositories/supabase-repository");
        await signInWithSupabase(values.email, values.password);
      } catch (error) {
        return {
          success: false,
          needsFamily: false,
          error: error instanceof Error ? error.message : "Unable to sign in right now."
        };
      }
    }

    const member = workspace?.members.find(
      (candidate) => candidate.email.toLowerCase() === values.email.trim().toLowerCase()
    );

    if (!member) {
      return {
        success: false,
        needsFamily: false,
        error: "No family member with that email was found in demo mode. Try grace@famtastic.app."
      };
    }

    startTransition(() => {
      commitWorkspace((current) => ({
        ...current,
        session: {
          ...current.session,
          userId: member.id,
          onboardingComplete: true,
          authMode: isSupabaseConfigured ? "supabase" : "demo",
          lastSeenAt: new Date().toISOString()
        }
      }));
    });

    return {
      success: true,
      needsFamily: !member.familyId
    };
  }

  async function signUp(values: AuthFormValues) {
    if (!values.name?.trim()) {
      return {
        success: false,
        needsFamily: false,
        error: "Please add a name so the rest of the family recognizes this profile."
      };
    }

    if (isSupabaseConfigured) {
      try {
        const { signUpWithSupabase } = await import("@/data/repositories/supabase-repository");
        await signUpWithSupabase(values.email, values.password);
      } catch (error) {
        return {
          success: false,
          needsFamily: false,
          error: error instanceof Error ? error.message : "Unable to create that account yet."
        };
      }
    }

    const pendingMember = createPendingMember(values.name.trim(), values.email.trim().toLowerCase());

    commitWorkspace((current) => ({
      ...current,
      members: [...current.members, pendingMember],
      session: {
        userId: pendingMember.id,
        onboardingComplete: true,
        authMode: isSupabaseConfigured ? "supabase" : "demo",
        lastSeenAt: new Date().toISOString()
      }
    }));

    return {
      success: true,
      needsFamily: true
    };
  }

  function continueWithDemo(memberId = "member-grace") {
    commitWorkspace((current) => ({
      ...current,
      session: {
        ...current.session,
        userId: memberId,
        onboardingComplete: true,
        authMode: "demo",
        lastSeenAt: new Date().toISOString()
      }
    }));
  }

  async function logout() {
    const endpoint = await unsubscribeFromPushNotifications();

    if (endpoint && isSupabaseConfigured) {
      const { deletePushSubscription } = await import("@/data/repositories/supabase-repository");
      await deletePushSubscription(endpoint);
    }

    if (workspace?.session.authMode === "supabase" && isSupabaseConfigured) {
      const { signOutFromSupabase } = await import("@/data/repositories/supabase-repository");
      await signOutFromSupabase();
    }

    await clearReminderScheduleFromWorker();
    setPushSubscriptionEnabled(false);

    commitWorkspace((current) => ({
      ...current,
      session: {
        ...current.session,
        userId: null,
        onboardingComplete: false
      }
    }));
  }

  function createFamilyFromSetup(values: FamilySetupValues) {
    if (!workspace || !currentUser) {
      return { success: false, error: "Please sign in before creating a family workspace." };
    }

    const familyName = values.familyName?.trim();

    if (!familyName) {
      return { success: false, error: "Add a family name so your workspace feels grounded from day one." };
    }

    const nextWorkspace = createStarterWorkspace(familyName, currentUser);
    setWorkspace(nextWorkspace);
    return { success: true };
  }

  function joinFamilyFromInvite(inviteCode: string) {
    if (!workspace || !currentUser || !workspace.family) {
      return { success: false, error: "Please sign in before joining a family." };
    }

    if (inviteCode.trim().toUpperCase() !== workspace.family.inviteCode.toUpperCase()) {
      return { success: false, error: "That invite code does not match the current family workspace." };
    }

    commitWorkspace((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === currentUser.id
          ? {
              ...member,
              familyId: current.family?.id ?? null
            }
          : member
      ),
      session: {
        ...current.session,
        onboardingComplete: true
      }
    }));

    return { success: true };
  }

  function markDutyComplete(assignmentId: string) {
    if (!workspace || !workspace.family || !currentUser) {
      return;
    }

    const targetAssignment = workspace.dutyAssignments.find((item) => item.id === assignmentId);

    if (!targetAssignment) {
      return;
    }

    if (targetAssignment.assignedTo !== currentUser.id && !canManageSchedules) {
      return;
    }

    const shouldSendCompletionNotification =
      targetAssignment.status !== "done" &&
      targetAssignment.assignedTo === currentUser.id &&
      notificationPermission === "granted" &&
      workspace.settings.reminderSettings.browserNotifications &&
      currentUser.notificationPreferences.browser;
    const completionPreview = buildCompletionFeedbackCopy(
      currentUser.shortName || currentUser.displayName,
      targetAssignment.title
    );

    commitWorkspace(
      (current) => {
        const assignment = current.dutyAssignments.find((item) => item.id === assignmentId);

        if (!assignment) {
          return current;
        }

        const nextStatus = assignment.status === "done" ? "pending" : "done";
        const completedAt = nextStatus === "done" ? new Date().toISOString() : null;
        const assignedMemberName =
          current.members.find((member) => member.id === assignment.assignedTo)?.displayName ?? "a family member";
        const completionFeedback =
          nextStatus === "done"
            ? assignment.assignedTo === currentUser.id
              ? buildCompletionFeedbackCopy(currentUser.shortName || currentUser.displayName, assignment.title)
              : {
                  title: `${assignment.title} is complete`,
                  body: `${currentUser.displayName} marked ${assignment.title} complete for ${assignedMemberName}.`,
                  severity: "gentle" as const
                }
            : buildReopenFeedbackCopy(assignment.title);
        const completionLog: CompletionLog = {
          id: `completion-${assignmentId}-${Date.now()}`,
          familyId: current.family?.id ?? "",
          assignmentType: "duty",
          assignmentId,
          memberId: assignment.assignedTo,
          completedAt: completedAt ?? new Date().toISOString(),
          status: "completed"
        };
        const completionLogs =
          nextStatus === "done"
            ? [...current.completionLogs, completionLog]
            : current.completionLogs.filter((log) => log.assignmentId !== assignmentId);

        return {
          ...current,
          dutyAssignments: current.dutyAssignments.map((item) =>
            item.id === assignmentId
              ? {
                  ...item,
                  status: nextStatus,
                  completedAt
                }
              : item
          ),
          completionLogs,
          notifications: [
            buildSystemNotification(current.family?.id ?? "", {
              title: completionFeedback.title,
              body: completionFeedback.body,
              severity: completionFeedback.severity
            }),
            ...current.notifications
          ],
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "duty-assignment",
              entityId: assignment.id,
              action: nextStatus === "done" ? "complete" : "reopen",
              summary:
                nextStatus === "done"
                  ? `${currentUser.displayName} marked ${assignment.title} complete.`
                  : `${currentUser.displayName} reopened ${assignment.title}.`,
              oldValue: {
                status: assignment.status,
                completedAt: assignment.completedAt
              },
              newValue: {
                status: nextStatus,
                completedAt
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "duty:update-status",
        payload: { assignmentId }
      }
    );

    if (shouldSendCompletionNotification) {
      void showEventNotification(completionPreview.title, completionPreview.body, `/app/duties?focus=${assignmentId}`, {
        tag: `famtastic-duty-${assignmentId}-completed`
      });
    }
  }

  function addShoppingItem(values: { name: string; category: string; urgency: UrgencyLevel }) {
    if (!workspace?.family || !currentUser || !values.name.trim()) {
      return;
    }

    commitWorkspace(
      (current) => {
        const item = {
          id: `shopping-${Date.now()}`,
          familyId: current.family?.id ?? "",
          name: values.name.trim(),
          category: values.category,
          urgency: values.urgency,
          addedById: currentUser.id,
          createdAt: new Date().toISOString(),
          checked: false,
          checkedAt: null
        };

        return {
          ...current,
          shoppingItems: [item, ...current.shoppingItems],
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "shopping-item",
              entityId: item.id,
              action: "create",
              summary: `${currentUser.displayName} added ${item.name} to the shared shopping list.`,
              newValue: {
                name: item.name,
                category: item.category,
                urgency: item.urgency
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "shopping:add",
        payload: values
      }
    );
  }

  function toggleShoppingItem(itemId: string) {
    commitWorkspace(
      (current) => {
        const targetItem = current.shoppingItems.find((item) => item.id === itemId);

        if (!targetItem) {
          return current;
        }

        const nextChecked = !targetItem.checked;

        return {
          ...current,
          shoppingItems: current.shoppingItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  checked: nextChecked,
                  checkedAt: nextChecked ? new Date().toISOString() : null
                }
              : item
          ),
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "shopping-item",
              entityId: targetItem.id,
              action: "edit",
              summary: `${currentUser?.displayName ?? "A family member"} ${nextChecked ? "checked off" : "reopened"} ${targetItem.name}.`,
              oldValue: {
                checked: targetItem.checked
              },
              newValue: {
                checked: nextChecked
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "shopping:toggle",
        payload: { itemId }
      }
    );
  }

  function markReminderRead(reminderId: string) {
    commitWorkspace((current) => ({
      ...current,
      readReminderIds: [...new Set([...current.readReminderIds, reminderId])]
    }));
  }

  function markAllRemindersRead() {
    commitWorkspace((current) => ({
      ...current,
      readReminderIds: [...new Set([...current.readReminderIds, ...reminders.map((reminder) => reminder.id)])]
    }));
  }

  function updateMealCook(mealId: string, memberId: string) {
    if (!canManageSchedules || !currentUser) {
      return;
    }

    commitWorkspace(
      (current) => {
        const meal = current.meals.find((item) => item.id === mealId);

        if (!meal || meal.cookId === memberId) {
          return current;
        }

        const previousCook = current.members.find((member) => member.id === meal.cookId)?.displayName ?? "Unassigned";
        const nextCook = current.members.find((member) => member.id === memberId)?.displayName ?? "Unassigned";

        return {
          ...current,
          meals: current.meals.map((item) => (item.id === mealId ? { ...item, cookId: memberId } : item)),
          notifications: [
            buildSystemNotification(current.family?.id ?? "", {
              title: "Meal plan updated",
              body: `${meal.title} was reassigned from ${previousCook} to ${nextCook}.`,
              severity: "important"
            }),
            ...current.notifications
          ],
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "meal",
              entityId: meal.id,
              action: "reassign",
              summary: `${currentUser.displayName} reassigned ${meal.title} from ${previousCook} to ${nextCook}.`,
              oldValue: {
                cookId: meal.cookId
              },
              newValue: {
                cookId: memberId
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "meal:update-cook",
        payload: { mealId, memberId }
      }
    );
  }

  function updateDevotion(
    devotionId: string,
    values: Partial<Pick<DevotionAssignment, "leaderId" | "bibleReading" | "topic" | "notes">>
  ) {
    if (!canManageSchedules || !currentUser) {
      return;
    }

    commitWorkspace(
      (current) => {
        const devotion = current.devotionAssignments.find((item) => item.id === devotionId);

        if (!devotion) {
          return current;
        }

        const nextDevotion = {
          ...devotion,
          ...values
        };

        return {
          ...current,
          devotionAssignments: current.devotionAssignments.map((item) =>
            item.id === devotionId ? nextDevotion : item
          ),
          notifications: [
            buildSystemNotification(current.family?.id ?? "", {
              title: "Devotion plan updated",
              body: `${nextDevotion.topic} now has ${current.members.find((member) => member.id === nextDevotion.leaderId)?.displayName ?? "a new leader"} leading.`,
              severity: "important"
            }),
            ...current.notifications
          ],
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "devotion",
              entityId: devotion.id,
              action: devotion.leaderId !== nextDevotion.leaderId ? "reassign" : "edit",
              summary: `${currentUser.displayName} updated the devotion plan for ${devotion.date}.`,
              oldValue: {
                leaderId: devotion.leaderId,
                bibleReading: devotion.bibleReading,
                topic: devotion.topic,
                notes: devotion.notes
              },
              newValue: {
                leaderId: nextDevotion.leaderId,
                bibleReading: nextDevotion.bibleReading,
                topic: nextDevotion.topic,
                notes: nextDevotion.notes
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "devotion:update",
        payload: { devotionId, ...values }
      }
    );
  }

  async function updateReminderSettings(values: Partial<WorkspaceState["settings"]["reminderSettings"]>) {
    if (!workspace || !canManageReminderRules || !currentUser) {
      return;
    }

    commitWorkspace((current) => {
      const nextReminderSettings = {
        ...current.settings.reminderSettings,
        ...values
      };

      return {
        ...current,
        settings: {
          ...current.settings,
          reminderSettings: nextReminderSettings
        },
        auditLogs: [
          buildAuditLog(current.family?.id ?? "", {
            entityType: "settings",
            entityId: "workspace-settings",
            action: "settings-update",
            summary: `${currentUser.displayName} updated the household reminder rules.`,
            oldValue: { ...current.settings.reminderSettings },
            newValue: { ...nextReminderSettings }
          }),
          ...current.auditLogs
        ]
      };
    });

    if (isSupabaseConfigured) {
      const { updateSupabaseReminderSettings } = await import("@/data/repositories/supabase-repository");
      await updateSupabaseReminderSettings({
        ...workspace.settings.reminderSettings,
        ...values
      });
    }
  }

  async function toggleDevotionSkipWeekday(weekday: number) {
    if (!workspace || !canManageSchedules || !currentUser || weekday < 0 || weekday > 6) {
      return;
    }

    const isSkipped = workspace.settings.devotionSkipWeekdays.includes(weekday);
    const nextSkipWeekdays = isSkipped
      ? workspace.settings.devotionSkipWeekdays.filter((item) => item !== weekday)
      : [...workspace.settings.devotionSkipWeekdays, weekday].sort((left, right) => left - right);

    commitWorkspace((current) => {
      const devotionAssignments = rebuildFutureDevotions(current, {
        devotionSkipWeekdays: nextSkipWeekdays
      });

      return {
        ...current,
        devotionAssignments,
        settings: {
          ...current.settings,
          devotionSkipWeekdays: nextSkipWeekdays
        },
        notifications: [
          buildSystemNotification(current.family?.id ?? "", {
            title: "Devotion rhythm updated",
            body: `${weekdayLabels[weekday]} is now ${isSkipped ? "active again" : "a rest day"} for family devotion.`,
            severity: "gentle"
          }),
          ...current.notifications
        ],
        auditLogs: [
          buildAuditLog(current.family?.id ?? "", {
            entityType: "settings",
            entityId: "workspace-settings",
            action: "settings-update",
            summary: `${currentUser.displayName} ${isSkipped ? "restored" : "paused"} devotion on ${weekdayLabels[weekday]}.`,
            oldValue: {
              devotionSkipWeekdays: current.settings.devotionSkipWeekdays
            },
            newValue: {
              devotionSkipWeekdays: nextSkipWeekdays
            }
          }),
          ...current.auditLogs
        ]
      };
    });

    if (isSupabaseConfigured) {
      const { updateSupabaseDevotionSkipWeekdays } = await import("@/data/repositories/supabase-repository");
      await updateSupabaseDevotionSkipWeekdays(nextSkipWeekdays);
    }
  }

  function updateMemberNotifications(memberId: string, patch: Partial<NotificationPreferences>) {
    if (!currentUser || (currentUser.id !== memberId && !canManageMembers)) {
      return;
    }

    commitWorkspace((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === memberId
          ? {
              ...member,
              notificationPreferences: {
                ...member.notificationPreferences,
                ...patch
              }
            }
          : member
      )
    }));
  }

  function updateMemberRole(memberId: string, role: FamilyRole) {
    if (!canManageMembers || !currentUser) {
      return;
    }

    commitWorkspace((current) => {
      const member = current.members.find((item) => item.id === memberId);

      if (!member || member.role === role) {
        return current;
      }

      const parentCount = current.members.filter((item) => item.role === "parent").length;

      if (member.role === "parent" && role !== "parent" && parentCount <= 1) {
        return current;
      }

      return {
        ...current,
        members: current.members.map((item) => (item.id === memberId ? { ...item, role } : item)),
        notifications: [
          buildSystemNotification(current.family?.id ?? "", {
            title: "Family role updated",
            body: `${member.displayName} is now ${role}.`,
            severity: "important"
          }),
          ...current.notifications
        ],
        auditLogs: [
          buildAuditLog(current.family?.id ?? "", {
            entityType: "member",
            entityId: member.id,
            action: "role-change",
            summary: `${currentUser.displayName} changed ${member.displayName}'s role from ${member.role} to ${role}.`,
            oldValue: {
              role: member.role
            },
            newValue: {
              role
            }
          }),
          ...current.auditLogs
        ]
      };
    });
  }

  function addFamilyMember(values: { name: string; email: string; role: FamilyRole }) {
    if (!workspace?.family || !canManageMembers || !currentUser) {
      return;
    }

    const member = createPendingMember(values.name.trim(), values.email.trim().toLowerCase());

    commitWorkspace(
      (current) => {
        const invitedMember = {
          ...member,
          familyId: current.family?.id ?? null,
          role: values.role
        };

        return {
          ...current,
          members: [...current.members, invitedMember],
          notifications: [
            buildSystemNotification(current.family?.id ?? "", {
              title: "Family member added",
              body: `${invitedMember.displayName} was invited into the family workspace as ${values.role}.`,
              severity: "gentle"
            }),
            ...current.notifications
          ],
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "member",
              entityId: invitedMember.id,
              action: "create",
              summary: `${currentUser.displayName} added ${invitedMember.displayName} to the workspace.`,
              newValue: {
                role: invitedMember.role,
                email: invitedMember.email
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "member:add",
        payload: values
      }
    );
  }

  function updateDutyTemplateSchedule(
    templateId: string,
    values: Partial<
      Pick<
        DutyTemplate,
        "assignmentMode" | "fixedAssigneeId" | "recurrence" | "intervalDays" | "startsOn" | "participantMemberIds" | "skipWeekdays" | "skipDates"
      >
    >
  ) {
    if (!workspace?.family || !canManageSchedules || !currentUser) {
      return;
    }

    commitWorkspace(
      (current) => {
        const template = current.dutyTemplates.find((item) => item.id === templateId);

        if (!template) {
          return current;
        }

        const normalizedTemplate = normalizeTemplateSchedule(template, sameFamilyMembers(current), values);
        const rebuilt = rebuildFutureAssignmentsForTemplate(current, normalizedTemplate);

        return {
          ...current,
          dutyTemplates: current.dutyTemplates.map((item) =>
            item.id === templateId ? rebuilt.template : item
          ),
          dutyAssignments: rebuilt.assignments,
          notifications: [
            buildSystemNotification(current.family?.id ?? "", {
              title: "Duty rotation updated",
              body: `${template.title} now follows ${normalizedTemplate.assignmentMode === "fixed" ? "a fixed assignment" : "a rotation queue"}.`,
              severity: "important"
            }),
            ...current.notifications
          ],
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "duty-template",
              entityId: template.id,
              action: "edit",
              summary: `${currentUser.displayName} updated the schedule settings for ${template.title}.`,
              oldValue: {
                assignmentMode: template.assignmentMode,
                fixedAssigneeId: template.fixedAssigneeId,
                recurrence: template.recurrence,
                intervalDays: template.intervalDays,
                startsOn: template.startsOn,
                participantMemberIds: template.participantMemberIds,
                skipWeekdays: template.skipWeekdays,
                skipDates: template.skipDates
              },
              newValue: {
                assignmentMode: normalizedTemplate.assignmentMode,
                fixedAssigneeId: normalizedTemplate.fixedAssigneeId,
                recurrence: normalizedTemplate.recurrence,
                intervalDays: normalizedTemplate.intervalDays,
                startsOn: normalizedTemplate.startsOn,
                participantMemberIds: normalizedTemplate.participantMemberIds,
                skipWeekdays: normalizedTemplate.skipWeekdays,
                skipDates: normalizedTemplate.skipDates
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "duty-template:update",
        payload: { templateId, ...values }
      }
    );
  }

  function toggleDutyTemplateParticipant(templateId: string, memberId: string) {
    if (!workspace?.family || !canManageSchedules || !currentUser) {
      return;
    }

    commitWorkspace(
      (current) => {
        const template = current.dutyTemplates.find((item) => item.id === templateId);

        if (!template) {
          return current;
        }

        const members = sameFamilyMembers(current);
        const activeParticipants = getDutyParticipantIds(template, members);
        const nextParticipants = activeParticipants.includes(memberId)
          ? activeParticipants.filter((item) => item !== memberId)
          : [...activeParticipants, memberId];

        if (nextParticipants.length === 0) {
          return current;
        }

        const normalizedTemplate = normalizeTemplateSchedule(template, members, {
          participantMemberIds: nextParticipants,
          fixedAssigneeId: nextParticipants.includes(template.fixedAssigneeId ?? "") ? template.fixedAssigneeId : nextParticipants[0] ?? null
        });
        const rebuilt = rebuildFutureAssignmentsForTemplate(current, normalizedTemplate);
        const memberName = current.members.find((member) => member.id === memberId)?.displayName ?? "Family member";

        return {
          ...current,
          dutyTemplates: current.dutyTemplates.map((item) => (item.id === templateId ? rebuilt.template : item)),
          dutyAssignments: rebuilt.assignments,
          notifications: [
            buildSystemNotification(current.family?.id ?? "", {
              title: "Duty participants updated",
              body: `${memberName} was ${activeParticipants.includes(memberId) ? "removed from" : "added to"} ${template.title}.`,
              severity: "important"
            }),
            ...current.notifications
          ],
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "duty-template",
              entityId: template.id,
              action: "edit",
              summary: `${currentUser.displayName} ${activeParticipants.includes(memberId) ? "removed" : "added"} ${memberName} ${activeParticipants.includes(memberId) ? "from" : "to"} ${template.title}.`,
              oldValue: {
                participantMemberIds: template.participantMemberIds
              },
              newValue: {
                participantMemberIds: rebuilt.template.participantMemberIds
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "duty-template:toggle-participant",
        payload: { templateId, memberId }
      }
    );
  }

  function toggleDutyTemplateSkipWeekday(templateId: string, weekday: number) {
    if (!workspace?.family || !canManageSchedules || !currentUser || weekday < 0 || weekday > 6) {
      return;
    }

    commitWorkspace(
      (current) => {
        const template = current.dutyTemplates.find((item) => item.id === templateId);

        if (!template) {
          return current;
        }

        const nextSkipWeekdays = template.skipWeekdays.includes(weekday)
          ? template.skipWeekdays.filter((item) => item !== weekday)
          : [...template.skipWeekdays, weekday].sort((left, right) => left - right);
        const normalizedTemplate = normalizeTemplateSchedule(template, sameFamilyMembers(current), {
          skipWeekdays: nextSkipWeekdays
        });
        const rebuilt = rebuildFutureAssignmentsForTemplate(current, normalizedTemplate);
        const actionLabel = template.skipWeekdays.includes(weekday) ? "restored" : "marked as a rest day";

        return {
          ...current,
          dutyTemplates: current.dutyTemplates.map((item) => (item.id === templateId ? rebuilt.template : item)),
          dutyAssignments: rebuilt.assignments,
          notifications: [
            buildSystemNotification(current.family?.id ?? "", {
              title: "Duty rest day updated",
              body: `${weekdayLabels[weekday]} is now ${template.skipWeekdays.includes(weekday) ? "active again" : "a skipped day"} for ${template.title}.`,
              severity: "gentle"
            }),
            ...current.notifications
          ],
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "duty-template",
              entityId: template.id,
              action: "edit",
              summary: `${currentUser.displayName} ${actionLabel} for ${template.title} on ${weekdayLabels[weekday]}.`,
              oldValue: {
                skipWeekdays: template.skipWeekdays
              },
              newValue: {
                skipWeekdays: rebuilt.template.skipWeekdays
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "duty-template:toggle-rest-day",
        payload: { templateId, weekday }
      }
    );
  }

  function overrideDutyAssignment(
    assignmentId: string,
    values: { assigneeId: string; mode: DutyOverrideMode; note?: string }
  ) {
    if (!workspace?.family || !canManageSchedules || !currentUser) {
      return;
    }

    commitWorkspace(
      (current) => {
        const assignment = current.dutyAssignments.find((item) => item.id === assignmentId);

        if (!assignment || assignment.status === "done") {
          return current;
        }

        const template = current.dutyTemplates.find((item) => item.id === assignment.templateId);
        const assignee = current.members.find((member) => member.id === values.assigneeId);

        if (!template || !assignee || assignee.familyId !== current.family?.id) {
          return current;
        }

        const members = sameFamilyMembers(current);
        const scheduledAssigneeId = assignment.scheduledAssigneeId || assignment.assignedTo;
        const updatedAssignment: DutyAssignment = {
          ...assignment,
          assignedTo: values.assigneeId,
          scheduledAssigneeId,
          assignmentSource: values.mode,
          overrideNote: values.note?.trim() ?? ""
        };
        let nextTemplate = normalizeTemplateSchedule(template, members);
        let nextAssignments = current.dutyAssignments.map((item) => (item.id === assignment.id ? updatedAssignment : item));
        let auditEntries = [
          buildAuditLog(current.family?.id ?? "", {
            entityType: "duty-assignment",
            entityId: assignment.id,
            action: "reassign",
            summary: `${currentUser.displayName} assigned ${assignment.title} to ${assignee.displayName} as a ${values.mode === "temporary-cover" ? "temporary cover" : "rotation shift"}.`,
            oldValue: {
              assignedTo: assignment.assignedTo,
              scheduledAssigneeId: assignment.scheduledAssigneeId,
              assignmentSource: assignment.assignmentSource,
              overrideNote: assignment.overrideNote
            },
            newValue: {
              assignedTo: updatedAssignment.assignedTo,
              scheduledAssigneeId: updatedAssignment.scheduledAssigneeId,
              assignmentSource: updatedAssignment.assignmentSource,
              overrideNote: updatedAssignment.overrideNote
            }
          })
        ];

        if (values.mode === "rotation-shift" && nextTemplate.assignmentMode === "rotation") {
          nextTemplate = {
            ...nextTemplate,
            rotationCursor: getRotationCursorAfterMember(nextTemplate, members, values.assigneeId),
            lastAssignedMemberId: values.assigneeId,
            lastAssignedAt: assignment.dueAt
          };

          const rebuilt = rebuildFutureAssignmentsForTemplate(
            {
              ...current,
              dutyAssignments: nextAssignments
            },
            nextTemplate,
            assignment.dueAt
          );

          nextTemplate = rebuilt.template;
          nextAssignments = rebuilt.assignments;
          auditEntries = [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "duty-template",
              entityId: template.id,
              action: "edit",
              summary: `${currentUser.displayName} advanced the ${template.title} rotation after reassigning this occurrence.`,
              oldValue: {
                rotationCursor: template.rotationCursor,
                lastAssignedMemberId: template.lastAssignedMemberId,
                lastAssignedAt: template.lastAssignedAt
              },
              newValue: {
                rotationCursor: nextTemplate.rotationCursor,
                lastAssignedMemberId: nextTemplate.lastAssignedMemberId,
                lastAssignedAt: nextTemplate.lastAssignedAt
              }
            }),
            ...auditEntries
          ];
        }

        return {
          ...current,
          dutyTemplates: current.dutyTemplates.map((item) => (item.id === template.id ? nextTemplate : item)),
          dutyAssignments: nextAssignments,
          notifications: [
            buildSystemNotification(current.family?.id ?? "", {
              title: values.mode === "temporary-cover" ? "Temporary cover assigned" : "Rotation shifted",
              body:
                values.mode === "temporary-cover"
                  ? `${assignee.displayName} will cover ${assignment.title} this time without changing the long-term queue.`
                  : `${assignee.displayName} now officially takes this turn for ${assignment.title}, and the queue continues from there.`,
              severity: "important"
            }),
            ...current.notifications
          ],
          auditLogs: [...auditEntries, ...current.auditLogs]
        };
      },
      {
        type: "duty-assignment:override",
        payload: {
          assignmentId,
          assigneeId: values.assigneeId,
          mode: values.mode
        }
      }
    );
  }

  function moveDutyRotationMember(templateId: string, memberId: string, direction: "up" | "down") {
    if (!workspace?.family || !canManageSchedules || !currentUser) {
      return;
    }

    commitWorkspace(
      (current) => {
        const template = current.dutyTemplates.find((item) => item.id === templateId);

        if (!template) {
          return current;
        }

        const nextTemplate = moveRotationMember(
          normalizeTemplateSchedule(template, sameFamilyMembers(current)),
          memberId,
          direction
        );

        if (nextTemplate.rotationOrder.join("|") === template.rotationOrder.join("|")) {
          return current;
        }

        const memberName = current.members.find((member) => member.id === memberId)?.displayName ?? "Family member";
        const rebuilt = rebuildFutureAssignmentsForTemplate(current, nextTemplate);

        return {
          ...current,
          dutyTemplates: current.dutyTemplates.map((item) => (item.id === templateId ? rebuilt.template : item)),
          dutyAssignments: rebuilt.assignments,
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "duty-template",
              entityId: template.id,
              action: "edit",
              summary: `${currentUser.displayName} moved ${memberName} ${direction} in the ${template.title} rotation.`,
              oldValue: {
                rotationOrder: template.rotationOrder
              },
              newValue: {
                rotationOrder: rebuilt.template.rotationOrder
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "duty-template:move-member",
        payload: { templateId, memberId, direction }
      }
    );
  }

  function toggleDutyRotationPause(templateId: string, memberId: string) {
    if (!workspace?.family || !canManageSchedules || !currentUser) {
      return;
    }

    commitWorkspace(
      (current) => {
        const template = current.dutyTemplates.find((item) => item.id === templateId);

        if (!template) {
          return current;
        }

        const paused = template.pausedMemberIds.includes(memberId);
        const pausedMemberIds = paused
          ? template.pausedMemberIds.filter((item) => item !== memberId)
          : [...template.pausedMemberIds, memberId];
        const memberName = current.members.find((member) => member.id === memberId)?.displayName ?? "Family member";
        const nextTemplate = normalizeTemplateSchedule(template, sameFamilyMembers(current), {
          participantMemberIds: template.participantMemberIds,
          skipWeekdays: template.skipWeekdays,
          skipDates: template.skipDates,
          fixedAssigneeId: template.fixedAssigneeId
        });
        const rebuilt = rebuildFutureAssignmentsForTemplate(
          current,
          {
            ...nextTemplate,
            pausedMemberIds
          }
        );

        return {
          ...current,
          dutyTemplates: current.dutyTemplates.map((item) => (item.id === templateId ? rebuilt.template : item)),
          dutyAssignments: rebuilt.assignments,
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "duty-template",
              entityId: template.id,
              action: "edit",
              summary: `${currentUser.displayName} ${paused ? "resumed" : "paused"} ${memberName} in the ${template.title} rotation.`,
              oldValue: {
                pausedMemberIds: template.pausedMemberIds
              },
              newValue: {
                pausedMemberIds: rebuilt.template.pausedMemberIds
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "duty-template:toggle-pause",
        payload: { templateId, memberId }
      }
    );
  }

  function resetDutyTemplateRotation(templateId: string) {
    if (!workspace?.family || !canManageSchedules || !currentUser) {
      return;
    }

    commitWorkspace(
      (current) => {
        const template = current.dutyTemplates.find((item) => item.id === templateId);

        if (!template) {
          return current;
        }

        const nextTemplate = resetDutyTemplateState(normalizeTemplateSchedule(template, sameFamilyMembers(current)));
        const rebuilt = rebuildFutureAssignmentsForTemplate(current, nextTemplate);

        return {
          ...current,
          dutyTemplates: current.dutyTemplates.map((item) => (item.id === templateId ? rebuilt.template : item)),
          dutyAssignments: rebuilt.assignments,
          notifications: [
            buildSystemNotification(current.family?.id ?? "", {
              title: "Rotation restarted",
              body: `${template.title} will continue again from the top of its queue.`,
              severity: "gentle"
            }),
            ...current.notifications
          ],
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "duty-template",
              entityId: template.id,
              action: "edit",
              summary: `${currentUser.displayName} reset the ${template.title} rotation queue.`,
              oldValue: {
                rotationCursor: template.rotationCursor,
                lastAssignedMemberId: template.lastAssignedMemberId,
                lastAssignedAt: template.lastAssignedAt
              },
              newValue: {
                rotationCursor: rebuilt.template.rotationCursor,
                lastAssignedMemberId: rebuilt.template.lastAssignedMemberId,
                lastAssignedAt: rebuilt.template.lastAssignedAt
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "duty-template:reset-rotation",
        payload: { templateId }
      }
    );
  }

  function generateNextWeek() {
    if (!canManageSchedules || !currentUser) {
      return;
    }

    commitWorkspace(
      (current) => {
        const beforeAssignments = current.dutyAssignments.length;
        const nextWorkspace = generateRotatedWorkspace(current);

        return {
          ...nextWorkspace,
          auditLogs: [
            buildAuditLog(current.family?.id ?? "", {
              entityType: "schedule",
              entityId: "rotation-generator",
              action: "generate",
              summary: `${currentUser.displayName} generated the next cycle of family rotations.`,
              oldValue: {
                dutyAssignments: beforeAssignments
              },
              newValue: {
                dutyAssignments: nextWorkspace.dutyAssignments.length
              }
            }),
            ...current.auditLogs
          ]
        };
      },
      {
        type: "schedule:generate-week",
        payload: { generatedAt: new Date().toISOString() }
      }
    );
  }

  function submitChangeRequest(values: {
    type: ChangeRequestType;
    targetType: AuditEntityType;
    targetId: string | null;
    title: string;
    details: string;
    requestedForMemberId?: string | null;
    proposedChanges?: Record<string, unknown>;
  }) {
    if (!workspace?.family || !currentUser) {
      return { success: false, error: "Please sign in before sending a request." };
    }

    if (!values.title.trim() || !values.details.trim()) {
      return { success: false, error: "Add a short title and reason so the request is easy to review." };
    }

    const request: ChangeRequestRecord = {
      id: `request-${Date.now()}`,
      familyId: workspace.family.id,
      type: values.type,
      targetType: values.targetType,
      targetId: values.targetId,
      requestedById: currentUser.id,
      requestedForMemberId: values.requestedForMemberId ?? null,
      title: values.title.trim(),
      details: values.details.trim(),
      proposedChanges: values.proposedChanges ?? {},
      status: "pending",
      reviewedById: null,
      reviewedAt: null,
      resolutionNote: "",
      createdAt: new Date().toISOString()
    };

    commitWorkspace(
      (current) => ({
        ...current,
        changeRequests: [request, ...current.changeRequests],
        notifications: [
          buildSystemNotification(current.family?.id ?? "", {
            title: "New change request",
            body: `${currentUser.displayName} submitted: ${request.title}.`,
            severity: "important"
          }),
          ...current.notifications
        ],
        auditLogs: [
          buildAuditLog(current.family?.id ?? "", {
            entityType: "change-request",
            entityId: request.id,
            action: "request",
            summary: `${currentUser.displayName} submitted a ${request.type} request.`,
            newValue: {
              targetType: request.targetType,
              targetId: request.targetId,
              requestedForMemberId: request.requestedForMemberId,
              title: request.title
            }
          }),
          ...current.auditLogs
        ]
      }),
      {
        type: "request:create",
        payload: {
          type: request.type,
          targetType: request.targetType,
          targetId: request.targetId
        }
      }
    );

    return { success: true };
  }

  function reviewChangeRequest(requestId: string, decision: "approved" | "rejected", resolutionNote = "") {
    if (!canReviewRequests || !currentUser) {
      return;
    }

    commitWorkspace(
      (current) => {
        const request = current.changeRequests.find((item) => item.id === requestId);

        if (!request || request.status !== "pending") {
          return current;
        }

        let nextState: WorkspaceState = current;
        const auditEntries = [
          buildAuditLog(current.family?.id ?? "", {
            entityType: "change-request",
            entityId: request.id,
            action: decision === "approved" ? "approve" : "reject",
            summary: `${currentUser.displayName} ${decision} ${request.title.toLowerCase()}.`,
            oldValue: {
              status: request.status
            },
            newValue: {
              status: decision
            }
          })
        ];

        if (decision === "approved") {
          if (request.type === "duty-swap" && request.targetId && typeof request.proposedChanges.assignedTo === "string") {
            const assignment = current.dutyAssignments.find((item) => item.id === request.targetId);

            if (assignment) {
              nextState = {
                ...nextState,
                dutyAssignments: nextState.dutyAssignments.map((item) =>
                  item.id === assignment.id
                    ? {
                        ...item,
                        assignedTo: request.proposedChanges.assignedTo as string,
                        scheduledAssigneeId: item.scheduledAssigneeId || item.assignedTo,
                        assignmentSource: "temporary-cover",
                        overrideNote: request.details
                      }
                    : item
                )
              };

              auditEntries.unshift(
                buildAuditLog(current.family?.id ?? "", {
                  entityType: "duty-assignment",
                  entityId: assignment.id,
                  action: "reassign",
                  summary: `${currentUser.displayName} approved a duty reassignment for ${assignment.title}.`,
                  oldValue: {
                    assignedTo: assignment.assignedTo
                  },
                  newValue: {
                    assignedTo: request.proposedChanges.assignedTo as string
                  }
                })
              );
            }
          }

          if (request.type === "meal-reassign" && request.targetId && typeof request.proposedChanges.cookId === "string") {
            const meal = current.meals.find((item) => item.id === request.targetId);

            if (meal) {
              nextState = {
                ...nextState,
                meals: nextState.meals.map((item) =>
                  item.id === meal.id ? { ...item, cookId: request.proposedChanges.cookId as string } : item
                )
              };

              auditEntries.unshift(
                buildAuditLog(current.family?.id ?? "", {
                  entityType: "meal",
                  entityId: meal.id,
                  action: "reassign",
                  summary: `${currentUser.displayName} approved a meal reassignment for ${meal.title}.`,
                  oldValue: {
                    cookId: meal.cookId
                  },
                  newValue: {
                    cookId: request.proposedChanges.cookId as string
                  }
                })
              );
            }
          }

          if (request.type === "devotion-reassign" && request.targetId && typeof request.proposedChanges.leaderId === "string") {
            const devotion = current.devotionAssignments.find((item) => item.id === request.targetId);

            if (devotion) {
              nextState = {
                ...nextState,
                devotionAssignments: nextState.devotionAssignments.map((item) =>
                  item.id === devotion.id ? { ...item, leaderId: request.proposedChanges.leaderId as string } : item
                )
              };

              auditEntries.unshift(
                buildAuditLog(current.family?.id ?? "", {
                  entityType: "devotion",
                  entityId: devotion.id,
                  action: "reassign",
                  summary: `${currentUser.displayName} approved a devotion leadership change for ${devotion.date}.`,
                  oldValue: {
                    leaderId: devotion.leaderId
                  },
                  newValue: {
                    leaderId: request.proposedChanges.leaderId as string
                  }
                })
              );
            }
          }
        }

        return {
          ...nextState,
          changeRequests: nextState.changeRequests.map((item) =>
            item.id === request.id
              ? {
                  ...item,
                  status: decision,
                  reviewedById: currentUser.id,
                  reviewedAt: new Date().toISOString(),
                  resolutionNote
                }
              : item
          ),
          notifications: [
            buildSystemNotification(current.family?.id ?? "", {
              title: decision === "approved" ? "Request approved" : "Request declined",
              body: `${request.title} was ${decision}${resolutionNote ? `: ${resolutionNote}` : "."}`,
              severity: decision === "approved" ? "gentle" : "important"
            }),
            ...nextState.notifications
          ],
          auditLogs: [...auditEntries, ...nextState.auditLogs]
        };
      },
      {
        type: "request:review",
        payload: { requestId, decision }
      }
    );
  }

  async function requestBrowserNotifications() {
    if (typeof Notification === "undefined") {
      return "unsupported";
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (canManageReminderRules) {
      await updateReminderSettings({ browserNotifications: permission === "granted" });
    }

    if (currentUser) {
      updateMemberNotifications(currentUser.id, { browser: permission === "granted" });
    }

    if (permission !== "granted") {
      const endpoint = await unsubscribeFromPushNotifications();
      setPushSubscriptionEnabled(false);

      if (endpoint && isSupabaseConfigured) {
        const { deletePushSubscription } = await import("@/data/repositories/supabase-repository");
        await deletePushSubscription(endpoint);
      }

      return permission;
    }

    await registerReminderBackgroundChecks();

    if (workspace && currentUser) {
      const schedule = buildDeviceNotificationSchedule(workspace, currentUser);

      if (schedule) {
        await syncReminderScheduleToWorker(schedule);
      }
    }

    await evaluateRemindersInWorker("permission-granted");

    if (canUsePushNotifications && isPushConfigured && currentUser?.familyId) {
      try {
        const { payload } = await subscribeToPushNotifications(vapidPublicKey);
        setPushSubscriptionEnabled(true);

        if (isSupabaseConfigured) {
          const { upsertPushSubscription } = await import("@/data/repositories/supabase-repository");
          await upsertPushSubscription(payload, {
            familyId: currentUser.familyId,
            installed: window.matchMedia("(display-mode: standalone)").matches
          });
        }
      } catch {
        setPushSubscriptionEnabled(false);
      }
    }

    return permission;
  }

  async function sendTestNotification() {
    if (notificationPermission !== "granted") {
      return false;
    }

    const previewCopy = buildNotificationPreviewCopy(currentUser?.shortName || currentUser?.displayName || "there");

    await showNotificationPreview(
      previewCopy.title,
      previewCopy.body,
      "/app/notifications"
    );

    return true;
  }

  async function promptInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function resetDemoWorkspace() {
    await clearWorkspaceState();
    await unsubscribeFromPushNotifications();
    await clearReminderScheduleFromWorker();
    setPushSubscriptionEnabled(false);
    setWorkspace({
      ...createSeedWorkspace(),
      settings: {
        ...defaultWorkspaceSettings()
      }
    });
  }

  return (
    <AppStateContext.Provider
      value={{
        workspace,
        isHydrating,
        isOnline,
        syncState,
        currentUser,
        familyMembers,
        isAdmin,
        canManageSchedules,
        canManageMembers,
        canManageReminderRules,
        canReviewRequests,
        canViewAuditHistory,
        reminders,
        unreadReminders,
        visibleChangeRequests,
        todayDutyAssignments,
        upcomingDutyAssignments,
        todayDevotion,
        nextDevotion,
        todayMeal,
        installReady: Boolean(installPrompt),
        notificationPermission,
        canUsePushNotifications,
        pushNotificationsConfigured: isPushConfigured,
        pushSubscriptionEnabled,
        signIn,
        signUp,
        continueWithDemo,
        logout,
        createFamilyFromSetup,
        joinFamilyFromInvite,
        markDutyComplete,
        addShoppingItem,
        toggleShoppingItem,
        markReminderRead,
        markAllRemindersRead,
        updateMealCook,
        updateDevotion,
        updateReminderSettings,
        toggleDevotionSkipWeekday,
        updateMemberNotifications,
        updateMemberRole,
        addFamilyMember,
        updateDutyTemplateSchedule,
        moveDutyRotationMember,
        toggleDutyRotationPause,
        toggleDutyTemplateParticipant,
        toggleDutyTemplateSkipWeekday,
        resetDutyTemplateRotation,
        overrideDutyAssignment,
        generateNextWeek,
        submitChangeRequest,
        reviewChangeRequest,
        requestBrowserNotifications,
        sendTestNotification,
        promptInstall,
        resetDemoWorkspace
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider.");
  }

  return context;
}
