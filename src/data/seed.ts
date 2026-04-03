import { addDays, formatISO, set, startOfDay, subDays } from "date-fns";
import type {
  AuditLogRecord,
  ChangeRequestRecord,
  CompletionLog,
  DevotionAssignment,
  DutyAssignment,
  DutyCategory,
  DutyRecurrence,
  DutyTemplate,
  Family,
  MealPlan,
  NotificationPreferences,
  NotificationRecord,
  ShoppingItem,
  UrgencyLevel,
  UserProfile,
  WorkspaceSettings,
  WorkspaceState
} from "@/data/types";

function baseNotificationPreferences(): NotificationPreferences {
  return {
    browser: true,
    stickyCards: true,
    devotionAlerts: true,
    mealAlerts: true,
    dutyAlerts: true,
    quietHoursEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "06:00"
  };
}

function createMember(
  familyId: string | null,
  id: string,
  displayName: string,
  email: string,
  role: UserProfile["role"],
  avatarTone: string
): UserProfile {
  return {
    id,
    familyId,
    email,
    displayName,
    shortName: displayName
      .split(" ")
      .map((chunk) => chunk[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    avatarTone,
    avatarSeed: `${displayName.toLowerCase().replace(/\s+/g, "-")}-${id}`,
    role,
    notificationPreferences: baseNotificationPreferences()
  };
}

function createFamily(name: string, referenceDate: Date): Family {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");

  return {
    id: `family-${slug.toLowerCase()}`,
    name,
    timezone: "Africa/Nairobi",
    inviteCode: `${slug}-${referenceDate.getFullYear().toString().slice(-2)}84`,
    motto: "Carry the home together, with warmth and consistency.",
    devotionRhythm: "Evening circle",
    createdAt: referenceDate.toISOString()
  };
}

function atTime(referenceDate: Date, offsetDays: number, hours: number, minutes = 0) {
  const target = addDays(startOfDay(referenceDate), offsetDays);
  return set(target, { hours, minutes, seconds: 0, milliseconds: 0 });
}

function createDutyTemplate(
  familyId: string,
  id: string,
  title: string,
  description: string,
  category: DutyCategory,
  dueTime: string,
  recurrence: DutyRecurrence,
  urgency: UrgencyLevel,
  options?: Partial<
    Pick<
      DutyTemplate,
      | "assignmentMode"
      | "fixedAssigneeId"
      | "rotationOrder"
      | "rotationCursor"
      | "lastAssignedMemberId"
      | "lastAssignedAt"
      | "pausedMemberIds"
      | "participantMemberIds"
      | "skipWeekdays"
      | "skipDates"
      | "intervalDays"
      | "startsOn"
    >
  >
): DutyTemplate {
  return {
    id,
    familyId,
    title,
    description,
    category,
    dueTime,
    recurrence,
    startsOn: options?.startsOn ?? formatISO(new Date(), { representation: "date" }),
    intervalDays: options?.intervalDays ?? (recurrence === "weekly" ? 7 : 1),
    urgency,
    assignmentMode: options?.assignmentMode ?? "rotation",
    fixedAssigneeId: options?.fixedAssigneeId ?? null,
    participantMemberIds: options?.participantMemberIds ?? [],
    rotationOrder: options?.rotationOrder ?? [],
    rotationCursor: options?.rotationCursor ?? 0,
    lastAssignedMemberId: options?.lastAssignedMemberId ?? null,
    lastAssignedAt: options?.lastAssignedAt ?? null,
    pausedMemberIds: options?.pausedMemberIds ?? [],
    skipWeekdays: options?.skipWeekdays ?? [],
    skipDates: options?.skipDates ?? [],
    active: true
  };
}

function createDutyAssignment(
  familyId: string,
  templateId: string,
  id: string,
  title: string,
  description: string,
  assignedTo: string,
  scheduledAssigneeId: string,
  dueAt: Date,
  recurrence: DutyRecurrence,
  urgency: UrgencyLevel,
  status: DutyAssignment["status"] = "pending",
  completedAt: Date | null = null,
  assignmentSource: DutyAssignment["assignmentSource"] = "rotation",
  overrideNote = ""
): DutyAssignment {
  return {
    id,
    familyId,
    templateId,
    title,
    description,
    assignedTo,
    scheduledAssigneeId,
    assignmentSource,
    overrideNote,
    dueAt: dueAt.toISOString(),
    recurrence,
    urgency,
    status,
    completedAt: completedAt ? completedAt.toISOString() : null
  };
}

function createDevotionAssignment(
  familyId: string,
  id: string,
  date: Date,
  leaderId: string,
  bibleReading: string,
  topic: string,
  notes: string
): DevotionAssignment {
  return {
    id,
    familyId,
    date: formatISO(date, { representation: "date" }),
    time: "20:00",
    leaderId,
    bibleReading,
    topic,
    notes,
    status: "planned"
  };
}

function createMeal(
  familyId: string,
  id: string,
  date: Date,
  title: string,
  cookId: string,
  ingredients: string[],
  notes: string
): MealPlan {
  return {
    id,
    familyId,
    date: formatISO(date, { representation: "date" }),
    title,
    cookId,
    ingredients,
    notes,
    status: "planned"
  };
}

function createShoppingItem(
  familyId: string,
  id: string,
  name: string,
  category: string,
  urgency: UrgencyLevel,
  addedById: string,
  createdAt: Date,
  checked = false
): ShoppingItem {
  return {
    id,
    familyId,
    name,
    category,
    urgency,
    addedById,
    createdAt: createdAt.toISOString(),
    checked,
    checkedAt: checked ? createdAt.toISOString() : null
  };
}

function createCompletionLog(
  familyId: string,
  id: string,
  assignmentType: CompletionLog["assignmentType"],
  assignmentId: string,
  memberId: string,
  completedAt: Date,
  status: CompletionLog["status"]
): CompletionLog {
  return {
    id,
    familyId,
    assignmentType,
    assignmentId,
    memberId,
    completedAt: completedAt.toISOString(),
    status
  };
}

function createChangeRequest(
  familyId: string,
  id: string,
  values: Omit<ChangeRequestRecord, "id" | "familyId">
): ChangeRequestRecord {
  return {
    id,
    familyId,
    ...values
  };
}

function createAuditLog(
  familyId: string,
  id: string,
  values: Omit<AuditLogRecord, "id" | "familyId">
): AuditLogRecord {
  return {
    id,
    familyId,
    ...values
  };
}

function createNotification(
  familyId: string,
  id: string,
  title: string,
  body: string,
  severity: NotificationRecord["severity"],
  createdAt: Date
): NotificationRecord {
  return {
    id,
    familyId,
    title,
    body,
    severity,
    channel: "in-app",
    createdAt: createdAt.toISOString(),
    readBy: [],
    source: "system"
  };
}

export function createPendingMember(name: string, email: string): UserProfile {
  return createMember(null, `member-${Date.now()}`, name, email, "parent", "#244236");
}

export function defaultWorkspaceSettings(): WorkspaceSettings {
  return {
    reminderSettings: {
      dueSoonMinutes: 60,
      upcomingWindowHours: 18,
      escalationMinutes: 30,
      browserNotifications: true,
      stickyOverdue: true,
      badgeCounts: true
    },
    shoppingCategories: ["Pantry", "Produce", "Cleaning", "Toiletries", "Breakfast"],
    mealFocus: "Simple food, prepared with calm and shared responsibility.",
    devotionTime: "20:00",
    devotionSkipWeekdays: [0]
  };
}

export function createStarterWorkspace(
  familyName: string,
  owner: UserProfile,
  referenceDate = new Date()
): WorkspaceState {
  const family = createFamily(familyName, referenceDate);
  const referenceDay = formatISO(referenceDate, { representation: "date" });
  const rootedOwner = {
    ...owner,
    familyId: family.id,
    role: "parent" as const
  };
  const memberIds = [rootedOwner.id];

  const dutyTemplates = [
    createDutyTemplate(
      family.id,
      "template-cooking",
      "Dinner cooking",
      "Prepare the family dinner with ingredients set aside in the morning.",
      "cooking",
      "18:00",
      "daily",
      "high",
      {
        startsOn: referenceDay,
        participantMemberIds: memberIds,
        skipWeekdays: [0],
        rotationOrder: memberIds,
        rotationCursor: 0,
        lastAssignedMemberId: rootedOwner.id,
        lastAssignedAt: atTime(referenceDate, 0, 18, 0).toISOString()
      }
    ),
    createDutyTemplate(
      family.id,
      "template-dishes",
      "Dishwashing",
      "Clear the sink and wipe the counters once dinner ends.",
      "dishes",
      "20:30",
      "daily",
      "medium",
      {
        startsOn: referenceDay,
        participantMemberIds: memberIds,
        rotationOrder: memberIds,
        rotationCursor: 0,
        lastAssignedMemberId: rootedOwner.id,
        lastAssignedAt: atTime(referenceDate, 0, 20, 30).toISOString()
      }
    ),
    createDutyTemplate(
      family.id,
      "template-devotion-space",
      "Prayer corner reset",
      "Prepare the living room and devotion materials before evening devotion.",
      "general",
      "19:30",
      "daily",
      "medium",
      {
        startsOn: referenceDay,
        assignmentMode: "fixed",
        fixedAssigneeId: rootedOwner.id,
        participantMemberIds: [rootedOwner.id],
        skipWeekdays: [0]
      }
    )
  ];

  const dutyAssignments = [
    createDutyAssignment(
      family.id,
      "template-cooking",
      "assignment-cooking-today",
      "Dinner cooking",
      "Prepare tonight's dinner and leave the kitchen ready for serving.",
      rootedOwner.id,
      rootedOwner.id,
      atTime(referenceDate, 0, 18, 0),
      "daily",
      "high"
    ),
    createDutyAssignment(
      family.id,
      "template-dishes",
      "assignment-dishes-today",
      "Dishwashing",
      "Clear the dishes, wipe counters, and reset the sink area.",
      rootedOwner.id,
      rootedOwner.id,
      atTime(referenceDate, 0, 20, 30),
      "daily",
      "medium"
    )
  ];

  const devotionAssignments = [
    createDevotionAssignment(
      family.id,
      "devotion-today",
      referenceDate,
      rootedOwner.id,
      "Psalm 121",
      "God keeps our going out and coming in",
      "Keep it short and hopeful for the first week."
    )
  ];

  const meals = [
    createMeal(
      family.id,
      "meal-today",
      referenceDate,
      "Rice and lentil stew",
      rootedOwner.id,
      ["Rice", "Lentils", "Tomatoes", "Onions", "Spinach"],
      "Soak the lentils early if possible."
    )
  ];

  return {
    family,
    members: [rootedOwner],
    dutyTemplates,
    dutyAssignments,
    devotionAssignments,
    meals,
    shoppingItems: [],
    notifications: [
      createNotification(
        family.id,
        "notification-welcome",
        "Your family workspace is ready",
        "Add a few responsibilities, invite members, and Famtastic will keep the rhythm visible each day.",
        "gentle",
        referenceDate
      )
    ],
    completionLogs: [],
    changeRequests: [],
    auditLogs: [],
    settings: defaultWorkspaceSettings(),
    queuedMutations: [],
    readReminderIds: [],
    browserPromptedIds: [],
    session: {
      userId: rootedOwner.id,
      onboardingComplete: true,
      authMode: "demo",
      lastSeenAt: referenceDate.toISOString()
    }
  };
}

export function createSeedWorkspace(referenceDate = new Date()): WorkspaceState {
  const family = createFamily("The Okello Family", referenceDate);
  const referenceDay = formatISO(referenceDate, { representation: "date" });
  const yesterdayDay = formatISO(addDays(referenceDate, -1), { representation: "date" });

  const members = [
    createMember(family.id, "member-grace", "Grace Okello", "grace@famtastic.app", "parent", "#274337"),
    createMember(family.id, "member-daniel", "Daniel Okello", "daniel@famtastic.app", "co-admin", "#835440"),
    createMember(family.id, "member-leah", "Leah Okello", "leah@famtastic.app", "member", "#bb7347"),
    createMember(family.id, "member-micah", "Micah Okello", "micah@famtastic.app", "member", "#688d73")
  ];

  const dutyTemplates = [
    createDutyTemplate(
      family.id,
      "template-cooking",
      "Dinner cooking",
      "Own dinner from prep through plating and leave the serving station tidy.",
      "cooking",
      "18:00",
      "daily",
      "high",
      {
        startsOn: referenceDay,
        participantMemberIds: ["member-leah", "member-daniel", "member-micah"],
        skipWeekdays: [0],
        rotationOrder: ["member-leah", "member-daniel", "member-grace", "member-micah"],
        rotationCursor: 2,
        lastAssignedMemberId: "member-daniel",
        lastAssignedAt: atTime(referenceDate, 1, 18, 0).toISOString()
      }
    ),
    createDutyTemplate(
      family.id,
      "template-dishes",
      "Dishwashing",
      "Clear dinner dishes, wipe counters, and reset the sink for the morning.",
      "dishes",
      "20:30",
      "daily",
      "high",
      {
        startsOn: yesterdayDay,
        participantMemberIds: members.map((member) => member.id),
        rotationOrder: ["member-daniel", "member-grace", "member-micah", "member-leah"],
        rotationCursor: 3,
        lastAssignedMemberId: "member-micah",
        lastAssignedAt: atTime(referenceDate, 1, 20, 30).toISOString()
      }
    ),
    createDutyTemplate(
      family.id,
      "template-cleaning",
      "Living room reset",
      "Straighten cushions, sweep the floor, and prepare the room for devotion.",
      "cleaning",
      "19:15",
      "daily",
      "medium",
      {
        startsOn: yesterdayDay,
        participantMemberIds: ["member-leah", "member-micah", "member-daniel"],
        rotationOrder: ["member-leah", "member-micah", "member-grace", "member-daniel"],
        rotationCursor: 2,
        lastAssignedMemberId: "member-micah",
        lastAssignedAt: atTime(referenceDate, 0, 19, 15).toISOString()
      }
    ),
    createDutyTemplate(
      family.id,
      "template-laundry",
      "Laundry fold",
      "Fold washed clothes and return them to each room before bedtime.",
      "laundry",
      "16:30",
      "weekdays",
      "medium",
      {
        startsOn: referenceDay,
        assignmentMode: "fixed",
        fixedAssigneeId: "member-grace",
        participantMemberIds: ["member-grace"],
        lastAssignedMemberId: "member-grace",
        lastAssignedAt: atTime(referenceDate, 0, 16, 30).toISOString()
      }
    ),
    createDutyTemplate(
      family.id,
      "template-general",
      "Prayer corner reset",
      "Open the windows, set out Bibles, and light the room softly before devotion.",
      "general",
      "19:40",
      "daily",
      "medium",
      {
        startsOn: referenceDay,
        participantMemberIds: ["member-daniel", "member-leah", "member-micah"],
        skipWeekdays: [0],
        rotationOrder: ["member-daniel", "member-leah", "member-micah", "member-grace"],
        rotationCursor: 1,
        lastAssignedMemberId: "member-daniel",
        lastAssignedAt: atTime(referenceDate, 0, 19, 40).toISOString()
      }
    )
  ];

  const dutyAssignments = [
    createDutyAssignment(
      family.id,
      "template-dishes",
      "assignment-dishes-yesterday",
      "Dishwashing duty",
      "Yesterday's sink reset is still pending and needs to be finished before lunch.",
      "member-daniel",
      "member-daniel",
      atTime(referenceDate, -1, 20, 30),
      "daily",
      "high"
    ),
    createDutyAssignment(
      family.id,
      "template-cooking",
      "assignment-cooking-today",
      "Dinner cooking",
      "Cook rice and beans for tonight and start prep one hour before serving.",
      "member-leah",
      "member-leah",
      atTime(referenceDate, 0, 18, 0),
      "daily",
      "high"
    ),
    createDutyAssignment(
      family.id,
      "template-dishes",
      "assignment-dishes-today",
      "Dishwashing",
      "Clear the dishes after dinner and leave the counters and sink ready for morning tea.",
      "member-grace",
      "member-grace",
      atTime(referenceDate, 0, 20, 30),
      "daily",
      "high"
    ),
    createDutyAssignment(
      family.id,
      "template-cleaning",
      "assignment-living-room-today",
      "Living room reset",
      "Prepare the room for the evening gathering and leave the cushions arranged.",
      "member-micah",
      "member-micah",
      atTime(referenceDate, 0, 19, 15),
      "daily",
      "medium"
    ),
    createDutyAssignment(
      family.id,
      "template-laundry",
      "assignment-laundry-today",
      "Laundry fold",
      "Fold the clean basket and place outfits for tomorrow in each room.",
      "member-grace",
      "member-grace",
      atTime(referenceDate, 0, 16, 30),
      "weekdays",
      "medium"
    ),
    createDutyAssignment(
      family.id,
      "template-general",
      "assignment-prayer-corner-today",
      "Prayer corner reset",
      "Get the devotion corner ready before the family gathers tonight.",
      "member-daniel",
      "member-daniel",
      atTime(referenceDate, 0, 19, 40),
      "daily",
      "medium"
    ),
    createDutyAssignment(
      family.id,
      "template-cooking",
      "assignment-cooking-tomorrow",
      "Dinner cooking",
      "Cook tomorrow's dinner and have ingredients prepped by late afternoon.",
      "member-daniel",
      "member-daniel",
      atTime(referenceDate, 1, 18, 0),
      "daily",
      "high"
    ),
    createDutyAssignment(
      family.id,
      "template-dishes",
      "assignment-dishes-tomorrow",
      "Dishwashing",
      "Reset the kitchen after dinner tomorrow.",
      "member-micah",
      "member-micah",
      atTime(referenceDate, 1, 20, 30),
      "daily",
      "high"
    ),
    createDutyAssignment(
      family.id,
      "template-cleaning",
      "assignment-cleaning-previous",
      "Living room reset",
      "Restore the room after devotion and return the chairs neatly.",
      "member-leah",
      "member-leah",
      atTime(referenceDate, -1, 19, 15),
      "daily",
      "medium",
      "done",
      atTime(referenceDate, -1, 19, 4)
    )
  ];

  const devotionAssignments = [
    createDevotionAssignment(
      family.id,
      "devotion-yesterday",
      addDays(referenceDate, -1),
      "member-grace",
      "Colossians 3:12-17",
      "Clothe yourselves with compassion",
      "Invite each person to share one thing they appreciated about the day."
    ),
    createDevotionAssignment(
      family.id,
      "devotion-today",
      referenceDate,
      "member-daniel",
      "Psalm 121",
      "God keeps our going out and our coming in",
      "Keep space for a short prayer round after the reading."
    ),
    createDevotionAssignment(
      family.id,
      "devotion-tomorrow",
      addDays(referenceDate, 1),
      "member-leah",
      "Matthew 5:14-16",
      "Let your light shine",
      "Leah will choose one family gratitude prompt."
    ),
    createDevotionAssignment(
      family.id,
      "devotion-next",
      addDays(referenceDate, 2),
      "member-micah",
      "Proverbs 3:5-6",
      "Trust in the Lord in all your ways",
      "Micah can use the illustrated Bible notes."
    )
  ];

  const meals = [
    createMeal(
      family.id,
      "meal-yesterday",
      addDays(referenceDate, -1),
      "Chapati and beef stew",
      "member-grace",
      ["Flour", "Beef", "Tomatoes", "Onions", "Coriander"],
      "Marinate the beef after breakfast."
    ),
    createMeal(
      family.id,
      "meal-today",
      referenceDate,
      "Rice and beans",
      "member-leah",
      ["Rice", "Beans", "Tomatoes", "Carrots", "Onions"],
      "Set the beans to boil by 4:30 PM."
    ),
    createMeal(
      family.id,
      "meal-tomorrow",
      addDays(referenceDate, 1),
      "Chicken stir-fry",
      "member-daniel",
      ["Chicken", "Bell peppers", "Soy sauce", "Rice", "Garlic"],
      "Prep the vegetables during the afternoon break."
    ),
    createMeal(
      family.id,
      "meal-next",
      addDays(referenceDate, 2),
      "Vegetable pasta",
      "member-grace",
      ["Pasta", "Tomatoes", "Spinach", "Parmesan", "Onions"],
      "Use the fresh spinach first."
    ),
    createMeal(
      family.id,
      "meal-friday",
      addDays(referenceDate, 3),
      "Fish with ugali",
      "member-micah",
      ["Fish", "Maize flour", "Kale", "Lemons", "Oil"],
      "Buy fish in the morning shopping round."
    )
  ];

  const shoppingItems = [
    createShoppingItem(family.id, "shopping-milk", "Milk", "Breakfast", "high", "member-micah", subDays(referenceDate, 1)),
    createShoppingItem(
      family.id,
      "shopping-detergent",
      "Laundry detergent",
      "Cleaning",
      "critical",
      "member-grace",
      subDays(referenceDate, 2)
    ),
    createShoppingItem(
      family.id,
      "shopping-tomatoes",
      "Tomatoes",
      "Produce",
      "medium",
      "member-leah",
      referenceDate
    ),
    createShoppingItem(
      family.id,
      "shopping-toilet-paper",
      "Toilet paper",
      "Toiletries",
      "high",
      "member-daniel",
      subDays(referenceDate, 1)
    ),
    createShoppingItem(
      family.id,
      "shopping-cinnamon",
      "Cinnamon",
      "Pantry",
      "low",
      "member-grace",
      subDays(referenceDate, 3),
      true
    )
  ];

  const completionLogs = [
    createCompletionLog(
      family.id,
      "log-1",
      "duty",
      "assignment-cleaning-previous",
      "member-leah",
      atTime(referenceDate, -1, 19, 4),
      "completed"
    ),
    createCompletionLog(
      family.id,
      "log-2",
      "meal",
      "meal-yesterday",
      "member-grace",
      atTime(referenceDate, -1, 18, 10),
      "completed"
    ),
    createCompletionLog(
      family.id,
      "log-3",
      "devotion",
      "devotion-yesterday",
      "member-grace",
      atTime(referenceDate, -1, 20, 24),
      "completed"
    ),
    createCompletionLog(
      family.id,
      "log-4",
      "duty",
      "assignment-dishes-yesterday",
      "member-daniel",
      atTime(referenceDate, -1, 22, 15),
      "missed"
    )
  ];

  const notifications = [
    createNotification(
      family.id,
      "notification-1",
      "Tonight's devotion has a leader",
      "Daniel is leading devotion this evening. Notes and Bible reading are already set.",
      "gentle",
      subDays(referenceDate, 0)
    ),
    createNotification(
      family.id,
      "notification-2",
      "Shopping list needs attention",
      "Laundry detergent and toilet paper are both marked urgent for the next restock run.",
      "important",
      subDays(referenceDate, 1)
    )
  ];

  const changeRequests = [
    createChangeRequest(family.id, "request-dishes-swap", {
      type: "duty-swap",
      targetType: "duty-assignment",
      targetId: "assignment-dishes-today",
      requestedById: "member-leah",
      requestedForMemberId: "member-micah",
      title: "Swap dishwashing with Micah",
      details: "I have evening study prep today and would like Micah to take dishwashing if approved.",
      proposedChanges: {
        assignedTo: "member-micah"
      },
      status: "pending",
      reviewedById: null,
      reviewedAt: null,
      resolutionNote: "",
      createdAt: subDays(referenceDate, 0).toISOString()
    })
  ];

  const auditLogs = [
    createAuditLog(family.id, "audit-reminder-settings", {
      entityType: "settings",
      entityId: "workspace-settings",
      action: "settings-update",
      actorId: "member-grace",
      actorRole: "parent",
      summary: "Grace adjusted the due-soon and escalation reminder timing.",
      oldValue: {
        dueSoonMinutes: 45,
        escalationMinutes: 20
      },
      newValue: {
        dueSoonMinutes: 60,
        escalationMinutes: 30
      },
      createdAt: subDays(referenceDate, 1).toISOString()
    }),
    createAuditLog(family.id, "audit-meal-reassign", {
      entityType: "meal",
      entityId: "meal-today",
      action: "reassign",
      actorId: "member-daniel",
      actorRole: "co-admin",
      summary: "Daniel reassigned tonight's cooking from Leah to Grace after school plans changed.",
      oldValue: {
        cookId: "member-leah"
      },
      newValue: {
        cookId: "member-grace"
      },
      createdAt: subDays(referenceDate, 2).toISOString()
    }),
    createAuditLog(family.id, "audit-duty-complete", {
      entityType: "duty-assignment",
      entityId: "assignment-prayer-corner-yesterday",
      action: "complete",
      actorId: "member-micah",
      actorRole: "member",
      summary: "Micah completed the prayer corner reset.",
      oldValue: {
        status: "pending"
      },
      newValue: {
        status: "done"
      },
      createdAt: subDays(referenceDate, 1).toISOString()
    })
  ];

  return {
    family,
    members,
    dutyTemplates,
    dutyAssignments,
    devotionAssignments,
    meals,
    shoppingItems,
    notifications,
    completionLogs,
    changeRequests,
    auditLogs,
    settings: defaultWorkspaceSettings(),
    queuedMutations: [],
    readReminderIds: [],
    browserPromptedIds: [],
    session: {
      userId: null,
      onboardingComplete: false,
      authMode: "demo",
      lastSeenAt: referenceDate.toISOString()
    }
  };
}
