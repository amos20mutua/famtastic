import { addDays, differenceInCalendarDays, formatISO, parseISO, startOfDay } from "date-fns";
import type { DutyAssignment, DutyTemplate, UserProfile } from "@/data/types";

function uniqueIds(values: string[]) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

export function getDutyParticipantIds(template: DutyTemplate, members: UserProfile[]) {
  const familyMemberIds = members.map((member) => member.id);
  const configuredParticipants =
    template.participantMemberIds.length > 0 ? template.participantMemberIds.filter((memberId) => familyMemberIds.includes(memberId)) : familyMemberIds;

  return uniqueIds(configuredParticipants);
}

function normalizeRotationOrder(template: DutyTemplate, members: UserProfile[]) {
  const participantIds = getDutyParticipantIds(template, members);
  const ordered = template.rotationOrder.filter((memberId) => participantIds.includes(memberId));
  const missing = participantIds.filter((memberId) => !ordered.includes(memberId));

  return [...ordered, ...missing];
}

export function getEligibleRotationOrder(template: DutyTemplate, members: UserProfile[]) {
  return normalizeRotationOrder(template, members).filter((memberId) => !template.pausedMemberIds.includes(memberId));
}

export function isDutySkippedOnDate(template: DutyTemplate, targetDate: Date) {
  const isoDate = formatISO(targetDate, { representation: "date" });

  return template.skipWeekdays.includes(targetDate.getDay()) || template.skipDates.includes(isoDate);
}

export function shouldCreateDutyOccurrence(template: DutyTemplate, targetDate: Date) {
  const startsOn = startOfDay(parseISO(template.startsOn));
  const day = startOfDay(targetDate);
  const diffDays = differenceInCalendarDays(day, startsOn);

  if (diffDays < 0 || !template.active || isDutySkippedOnDate(template, day)) {
    return false;
  }

  if (template.recurrence === "daily") {
    return diffDays % Math.max(1, template.intervalDays) === 0;
  }

  if (template.recurrence === "weekdays") {
    const dayOfWeek = day.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6 && diffDays % Math.max(1, template.intervalDays) === 0;
  }

  if (template.recurrence === "weekly") {
    return day.getDay() === startsOn.getDay() && diffDays % Math.max(7, template.intervalDays) === 0;
  }

  return diffDays % Math.max(1, template.intervalDays) === 0;
}

export function assignTemplateOccurrence(
  template: DutyTemplate,
  members: UserProfile[],
  dueAt: string
): { assigneeId: string | null; scheduledAssigneeId: string | null; assignmentSource: DutyAssignment["assignmentSource"]; template: DutyTemplate } {
  if (template.assignmentMode === "fixed") {
    return {
      assigneeId: template.fixedAssigneeId,
      scheduledAssigneeId: template.fixedAssigneeId,
      assignmentSource: "fixed",
      template: {
        ...template
      }
    };
  }

  const order = getEligibleRotationOrder(template, members);

  if (order.length === 0) {
    return {
      assigneeId: null,
      scheduledAssigneeId: null,
      assignmentSource: "rotation",
      template
    };
  }

  const nextIndex = template.rotationCursor % order.length;
  const assigneeId = order[nextIndex];

  return {
    assigneeId,
    scheduledAssigneeId: assigneeId,
    assignmentSource: "rotation",
    template: {
      ...template,
      participantMemberIds: getDutyParticipantIds(template, members),
      rotationOrder: normalizeRotationOrder(template, members),
      rotationCursor: (nextIndex + 1) % order.length,
      lastAssignedMemberId: assigneeId,
      lastAssignedAt: dueAt
    }
  };
}

export function getRotationPreview(template: DutyTemplate, members: UserProfile[], count = 4) {
  if (template.assignmentMode === "fixed") {
    return template.fixedAssigneeId ? [template.fixedAssigneeId] : [];
  }

  const order = getEligibleRotationOrder(template, members);

  if (order.length === 0) {
    return [];
  }

  return Array.from({ length: Math.max(1, count) }, (_, index) => order[(template.rotationCursor + index) % order.length]);
}

export function getNextRotationMemberId(template: DutyTemplate, members: UserProfile[]) {
  return getRotationPreview(template, members, 1)[0] ?? null;
}

export function getRotationCursorAfterMember(template: DutyTemplate, members: UserProfile[], memberId: string | null) {
  const order = getEligibleRotationOrder(template, members);

  if (!memberId || order.length === 0) {
    return 0;
  }

  const memberIndex = order.indexOf(memberId);

  if (memberIndex === -1) {
    return template.rotationCursor % order.length;
  }

  return (memberIndex + 1) % order.length;
}

export function getOfficialAssignmentMemberId(assignment: Pick<DutyAssignment, "assignedTo" | "scheduledAssigneeId" | "assignmentSource">) {
  return assignment.assignmentSource === "temporary-cover" ? assignment.scheduledAssigneeId : assignment.assignedTo;
}

export function resetDutyRotation(template: DutyTemplate) {
  return {
    ...template,
    rotationCursor: 0,
    lastAssignedMemberId: null,
    lastAssignedAt: null
  };
}

export function moveRotationMember(template: DutyTemplate, memberId: string, direction: "up" | "down") {
  const order = [...template.rotationOrder];
  const currentIndex = order.indexOf(memberId);

  if (currentIndex === -1) {
    return template;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= order.length) {
    return template;
  }

  [order[currentIndex], order[targetIndex]] = [order[targetIndex], order[currentIndex]];

  return {
    ...template,
    rotationOrder: order
  };
}

export function buildUpcomingOccurrenceDates(template: DutyTemplate, startDate: Date, count: number) {
  const dates: Date[] = [];
  let candidateDate = startOfDay(startDate);
  let scannedDays = 0;
  const scanLimit = Math.max(
    180,
    Math.max(1, count) * Math.max(1, template.intervalDays) * (template.recurrence === "weekly" ? 21 : 4)
  );

  while (dates.length < Math.max(1, count) && scannedDays < scanLimit) {
    if (shouldCreateDutyOccurrence(template, candidateDate)) {
      dates.push(candidateDate);
    }

    candidateDate = addDays(candidateDate, 1);
    scannedDays += 1;
  }

  return dates;
}
