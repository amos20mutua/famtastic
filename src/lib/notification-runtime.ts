import { addMinutes, differenceInMinutes, parseISO } from "date-fns";
import type {
  DeviceNotificationSchedule,
  DeviceNotificationTask,
  EvaluatedNotification,
  NotificationDeliveryRecord,
  NotificationLifecycleState,
  ReminderItem,
  ReminderSeverity,
  UserProfile,
  WorkspaceState
} from "@/data/types";
import { buildDeviceNotificationCopy } from "@/lib/notification-copy";

function isWithinQuietHours(now: Date, quietStart: string, quietEnd: string) {
  const [startHour, startMinute] = quietStart.split(":").map(Number);
  const [endHour, endMinute] = quietEnd.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (startMinutes === endMinutes) {
    return false;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function scheduledWindowMinutes(schedule: DeviceNotificationSchedule) {
  return Math.max(schedule.settings.dueSoonMinutes + 30, schedule.settings.upcomingWindowHours * 60);
}

function dueGraceMinutes(schedule: DeviceNotificationSchedule) {
  return Math.max(5, Math.min(15, Math.floor(schedule.settings.dueSoonMinutes / 2) || 5));
}

function notificationStateForDueAt(
  dueAt: string,
  schedule: DeviceNotificationSchedule,
  now = new Date()
): NotificationLifecycleState | null {
  const minutesUntilDue = differenceInMinutes(parseISO(dueAt), now);

  if (minutesUntilDue > scheduledWindowMinutes(schedule)) {
    return null;
  }

  if (minutesUntilDue > schedule.settings.dueSoonMinutes) {
    return "scheduled";
  }

  if (minutesUntilDue > 0) {
    return "upcoming";
  }

  if (minutesUntilDue >= -dueGraceMinutes(schedule)) {
    return "due";
  }

  return "overdue";
}

function severityForTask(task: DeviceNotificationTask, state: NotificationLifecycleState): ReminderSeverity {
  if (state === "overdue") {
    return "urgent";
  }

  if (state === "due" || task.urgency === "critical" || task.urgency === "high") {
    return "important";
  }

  return "gentle";
}

function memberNotificationName(member: UserProfile) {
  return member.shortName || member.displayName;
}

export function buildDeviceNotificationSchedule(workspace: WorkspaceState, member: UserProfile): DeviceNotificationSchedule | null {
  if (!workspace.family || !member.familyId) {
    return null;
  }

  const memberName = memberNotificationName(member);
  const tasks: DeviceNotificationTask[] = [];

  if (member.notificationPreferences.dutyAlerts) {
    for (const assignment of workspace.dutyAssignments) {
      if (assignment.status !== "pending" || assignment.assignedTo !== member.id) {
        continue;
      }

      tasks.push({
        id: `task-duty-${assignment.id}`,
        kind: "duty",
        relatedId: assignment.id,
        familyId: workspace.family.id,
        memberId: member.id,
        memberName,
        title: assignment.title,
        summary: "",
        description: assignment.description,
        dueAt: assignment.dueAt,
        urgency: assignment.urgency,
        url: `/app/duties?focus=${assignment.id}`,
        preferenceChannel: "duty"
      });
    }
  }

  if (member.notificationPreferences.mealAlerts) {
    for (const meal of workspace.meals) {
      if (meal.cookId !== member.id || meal.status === "done") {
        continue;
      }

      tasks.push({
        id: `task-meal-${meal.id}`,
        kind: "meal",
        relatedId: meal.id,
        familyId: workspace.family.id,
        memberId: member.id,
        memberName,
        title: meal.title,
        summary: meal.ingredients.length > 0 ? `Ingredients: ${meal.ingredients.join(", ")}` : "Dinner plan is ready.",
        description: meal.notes || "Open the meal plan to review the timing and details.",
        dueAt: `${meal.date}T18:00:00`,
        urgency: "high",
        url: `/app/meals?focus=${meal.id}`,
        preferenceChannel: "meal"
      });
    }
  }

  if (member.notificationPreferences.devotionAlerts) {
    for (const devotion of workspace.devotionAssignments) {
      if (devotion.leaderId !== member.id || devotion.status === "done") {
        continue;
      }

      tasks.push({
        id: `task-devotion-${devotion.id}`,
        kind: "devotion",
        relatedId: devotion.id,
        familyId: workspace.family.id,
        memberId: member.id,
        memberName,
        title: "Family devotion",
        summary: devotion.topic ? `Topic: ${devotion.topic}` : "Family devotion is planned.",
        description: [`Reading: ${devotion.bibleReading}`, devotion.notes || "Open the devotion plan to review the notes."]
          .filter(Boolean)
          .join(". "),
        dueAt: `${devotion.date}T${devotion.time}:00`,
        urgency: "high",
        url: `/app/devotions?focus=${devotion.id}`,
        preferenceChannel: "devotion"
      });
    }
  }

  tasks.sort((left, right) => left.dueAt.localeCompare(right.dueAt));

  return {
    familyId: workspace.family.id,
    memberId: member.id,
    syncedAt: new Date().toISOString(),
    settings: workspace.settings.reminderSettings,
    quietHoursEnabled: member.notificationPreferences.quietHoursEnabled,
    quietHoursStart: member.notificationPreferences.quietHoursStart,
    quietHoursEnd: member.notificationPreferences.quietHoursEnd,
    tasks
  };
}

export function buildMemberReminderItems(reminders: ReminderItem[], memberId: string | null) {
  if (!memberId) {
    return [];
  }

  return reminders.filter((reminder) => reminder.assigneeId === memberId);
}

export function evaluateNotificationTask(
  schedule: DeviceNotificationSchedule,
  task: DeviceNotificationTask,
  deliveries: Map<string, NotificationDeliveryRecord>,
  now = new Date()
): EvaluatedNotification | null {
  const state = notificationStateForDueAt(task.dueAt, schedule, now);

  if (!state) {
    return null;
  }

  if (
    schedule.quietHoursEnabled &&
    state !== "overdue" &&
    state !== "due" &&
    isWithinQuietHours(now, schedule.quietHoursStart, schedule.quietHoursEnd)
  ) {
    return null;
  }

  const previous = deliveries.get(task.id);

  if (previous?.state === state && state !== "overdue") {
    return null;
  }

  if (previous?.state === state && state === "overdue" && previous.nextEligibleAt) {
    if (parseISO(previous.nextEligibleAt) > now) {
      return null;
    }
  }

  const deliveryCount = previous?.state === state ? (previous.deliveryCount || 1) + 1 : 1;
  const copy = buildDeviceNotificationCopy(task, state, deliveryCount);
  const tag = `famtastic-${task.kind}-${task.relatedId}`;

  return {
    id: `${task.id}-${state}-${deliveryCount}`,
    taskId: task.id,
    title: copy.title,
    body: copy.body,
    state,
    severity: severityForTask(task, state),
    tag,
    url: task.url,
    dueAt: task.dueAt,
    repeatAfterMinutes: state === "overdue" ? schedule.settings.escalationMinutes : null,
    deliveryCount
  };
}

export function nextDeliveryRecord(payload: EvaluatedNotification, now = new Date()): NotificationDeliveryRecord {
  return {
    taskId: payload.taskId,
    state: payload.state,
    sentAt: now.toISOString(),
    nextEligibleAt:
      payload.repeatAfterMinutes === null ? null : addMinutes(now, payload.repeatAfterMinutes).toISOString(),
    deliveryCount: payload.deliveryCount,
    tag: payload.tag
  };
}
