import { compareAsc, differenceInMinutes, parseISO } from "date-fns";
import type { ReminderItem, ReminderSeverity, ReminderState, WorkspaceState } from "@/data/types";
import { buildReminderCopy } from "@/lib/notification-copy";

function severityForState(state: ReminderState, urgency: "low" | "medium" | "high" | "critical"): ReminderSeverity {
  if (state === "overdue") {
    return "urgent";
  }

  if (state === "due-soon" || urgency === "critical" || urgency === "high") {
    return "important";
  }

  return "gentle";
}

function stateFromMinutes(minutesUntilDue: number, dueSoonMinutes: number): ReminderState {
  if (minutesUntilDue < 0) {
    return "overdue";
  }

  if (minutesUntilDue <= dueSoonMinutes) {
    return "due-soon";
  }

  return "upcoming";
}

function makeReminder(
  kind: ReminderItem["kind"],
  relatedId: string,
  assigneeId: string,
  title: string,
  body: string,
  dueAt: string,
  state: ReminderState,
  severity: ReminderSeverity,
  read: boolean,
  sticky: boolean,
  actionableLabel: string
): ReminderItem {
  return {
    id: `${kind}-${relatedId}-${state}`,
    kind,
    relatedId,
    assigneeId,
    title,
    body,
    dueAt,
    state,
    severity,
    sticky,
    read,
    actionableLabel
  };
}

export function buildReminderItems(state: WorkspaceState, now = new Date()) {
  const { dueSoonMinutes, upcomingWindowHours, stickyOverdue } = state.settings.reminderSettings;
  const reminders: ReminderItem[] = [];
  const upcomingMinutes = upcomingWindowHours * 60;
  const memberNames = new Map(
    state.members.map((member) => [member.id, member.shortName || member.displayName] as const)
  );

  state.dutyAssignments
    .filter((assignment) => assignment.status === "pending")
    .forEach((assignment) => {
      const minutesUntilDue = differenceInMinutes(parseISO(assignment.dueAt), now);

      if (minutesUntilDue > upcomingMinutes) {
        return;
      }

      const reminderState = stateFromMinutes(minutesUntilDue, dueSoonMinutes);
      const copy = buildReminderCopy(
        {
          id: assignment.id,
          kind: "duty",
          title: assignment.title,
          summary: "",
          description: assignment.description,
          dueAt: assignment.dueAt,
          memberName: memberNames.get(assignment.assignedTo) ?? "Family member"
        },
        reminderState
      );

      reminders.push(
        makeReminder(
          "duty",
          assignment.id,
          assignment.assignedTo,
          copy.title,
          copy.body,
          assignment.dueAt,
          reminderState,
          severityForState(reminderState, assignment.urgency),
          state.readReminderIds.includes(`duty-${assignment.id}-${reminderState}`),
          stickyOverdue && reminderState === "overdue",
          "Mark done"
        )
      );
    });

  state.meals.forEach((meal) => {
    if (meal.status === "done") {
      return;
    }

    const dueAt = `${meal.date}T18:00:00`;
    const minutesUntilDue = differenceInMinutes(parseISO(dueAt), now);

    if (minutesUntilDue > upcomingMinutes) {
      return;
    }

    const reminderState = stateFromMinutes(minutesUntilDue, dueSoonMinutes);
    const copy = buildReminderCopy(
      {
        id: meal.id,
        kind: "meal",
        title: meal.title,
        summary: meal.ingredients.length > 0 ? `Ingredients: ${meal.ingredients.join(", ")}` : "Dinner plan is ready.",
        description: meal.notes || "Open the meal plan to review the timing and details.",
        dueAt,
        memberName: memberNames.get(meal.cookId) ?? "Family member"
      },
      reminderState
    );

    reminders.push(
      makeReminder(
        "meal",
        meal.id,
        meal.cookId,
        copy.title,
        copy.body,
        dueAt,
        reminderState,
        reminderState === "overdue" ? "urgent" : "important",
        state.readReminderIds.includes(`meal-${meal.id}-${reminderState}`),
        reminderState !== "upcoming",
        "View meal"
      )
    );
  });

  state.devotionAssignments.forEach((devotion) => {
    if (devotion.status === "done") {
      return;
    }

    const dueAt = `${devotion.date}T${devotion.time}:00`;
    const minutesUntilDue = differenceInMinutes(parseISO(dueAt), now);

    if (minutesUntilDue > upcomingMinutes) {
      return;
    }

    const reminderState = stateFromMinutes(minutesUntilDue, dueSoonMinutes);
    const copy = buildReminderCopy(
      {
        id: devotion.id,
        kind: "devotion",
        title: "Family devotion",
        summary: devotion.topic ? `Topic: ${devotion.topic}` : "Family devotion is planned.",
        description: [`Reading: ${devotion.bibleReading}`, devotion.notes || "Open the devotion plan to review the notes."]
          .filter(Boolean)
          .join(". "),
        dueAt,
        memberName: memberNames.get(devotion.leaderId) ?? "Family member"
      },
      reminderState
    );

    reminders.push(
      makeReminder(
        "devotion",
        devotion.id,
        devotion.leaderId,
        copy.title,
        copy.body,
        dueAt,
        reminderState,
        reminderState === "upcoming" ? "gentle" : "important",
        state.readReminderIds.includes(`devotion-${devotion.id}-${reminderState}`),
        reminderState !== "upcoming",
        "Open devotion"
      )
    );
  });

  return reminders.sort((left, right) => {
    const severityRank: Record<ReminderSeverity, number> = {
      urgent: 0,
      important: 1,
      gentle: 2
    };

    const stateRank: Record<ReminderState, number> = {
      overdue: 0,
      "due-soon": 1,
      upcoming: 2
    };

    return (
      severityRank[left.severity] - severityRank[right.severity] ||
      stateRank[left.state] - stateRank[right.state] ||
      compareAsc(parseISO(left.dueAt), parseISO(right.dueAt))
    );
  });
}
