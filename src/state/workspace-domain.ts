import { addDays, formatISO, isSameDay, parseISO, set, startOfDay } from "date-fns";
import type { DevotionAssignment, DutyAssignment, DutyTemplate, FamilyRole, UserProfile, WorkspaceState } from "@/data/types";
import {
  assignTemplateOccurrence,
  buildUpcomingOccurrenceDates,
  getDutyParticipantIds,
  getOfficialAssignmentMemberId,
  getRotationCursorAfterMember
} from "@/lib/rotations";

function createGeneratedId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function withQueuedMutation(
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

export function sameFamilyMembers(workspace: WorkspaceState) {
  if (!workspace.family) {
    return [];
  }

  return workspace.members.filter((member) => member.familyId === workspace.family?.id);
}

export function isGovernanceRole(role: FamilyRole | null | undefined) {
  return role === "parent" || role === "co-admin";
}

export function normalizeTemplateSchedule(
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
      id: createGeneratedId("assignment"),
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

export function rebuildFutureAssignmentsForTemplate(
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
          id: createGeneratedId("devotion"),
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

export function rebuildFutureDevotions(
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

export function generateRotatedWorkspace(workspace: WorkspaceState) {
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
      id: createGeneratedId("meal"),
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

export { getDutyParticipantIds };
