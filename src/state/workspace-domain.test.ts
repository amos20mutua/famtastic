import { addDays, formatISO } from "date-fns";
import { describe, expect, it } from "vitest";
import type { DutyTemplate, UserProfile, WorkspaceState } from "@/data/types";
import {
  normalizeTemplateSchedule,
  rebuildFutureDevotions,
  withQueuedMutation
} from "@/state/workspace-domain";

function buildMember(id: string): UserProfile {
  return {
    id,
    familyId: "family-1",
    email: `${id}@example.com`,
    displayName: id,
    shortName: id.slice(0, 2).toUpperCase(),
    avatarTone: "#274337",
    avatarSeed: `${id}-seed`,
    role: "member",
    notificationPreferences: {
      browser: true,
      stickyCards: true,
      devotionAlerts: true,
      mealAlerts: true,
      dutyAlerts: true,
      quietHoursEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "06:00"
    }
  };
}

function buildTemplate(): DutyTemplate {
  return {
    id: "template-1",
    familyId: "family-1",
    title: "Dishes",
    description: "",
    category: "dishes",
    dueTime: "20:00",
    recurrence: "daily",
    startsOn: formatISO(new Date(), { representation: "date" }),
    intervalDays: 1,
    urgency: "medium",
    assignmentMode: "fixed",
    fixedAssigneeId: "member-1",
    participantMemberIds: ["member-1", "member-2"],
    rotationOrder: ["member-1", "member-2"],
    rotationCursor: 0,
    lastAssignedMemberId: null,
    lastAssignedAt: null,
    pausedMemberIds: [],
    skipWeekdays: [],
    skipDates: [],
    active: true
  };
}

function buildWorkspace(): WorkspaceState {
  const today = formatISO(new Date(), { representation: "date" });

  return {
    family: {
      id: "family-1",
      name: "Family",
      timezone: "Africa/Nairobi",
      inviteCode: "FAMT-1111",
      motto: "",
      devotionRhythm: "Evening",
      createdAt: new Date().toISOString()
    },
    members: [buildMember("member-1"), buildMember("member-2")],
    dutyTemplates: [],
    dutyAssignments: [],
    devotionAssignments: [
      {
        id: "devotion-today",
        familyId: "family-1",
        date: today,
        time: "20:00",
        leaderId: "member-1",
        bibleReading: "Psalm 1",
        topic: "Trust",
        notes: "",
        status: "planned"
      }
    ],
    meals: [],
    shoppingItems: [],
    notifications: [],
    completionLogs: [],
    changeRequests: [],
    auditLogs: [],
    settings: {
      reminderSettings: {
        dueSoonMinutes: 60,
        upcomingWindowHours: 18,
        escalationMinutes: 30,
        browserNotifications: true,
        stickyOverdue: true,
        badgeCounts: true
      },
      shoppingCategories: ["Pantry"],
      mealFocus: "",
      devotionTime: "20:00",
      devotionSkipWeekdays: []
    },
    queuedMutations: [],
    readReminderIds: [],
    browserPromptedIds: [],
    session: {
      userId: "member-1",
      onboardingComplete: true,
      authMode: "demo",
      lastSeenAt: null
    }
  };
}

describe("workspace-domain", () => {
  it("queues mutations when requested", () => {
    const workspace = buildWorkspace();
    const queued = withQueuedMutation(workspace, "shopping:add", { name: "Milk" }, true);
    const passthrough = withQueuedMutation(workspace, "shopping:add", { name: "Milk" }, false);

    expect(queued.queuedMutations).toHaveLength(1);
    expect(queued.queuedMutations[0]?.type).toBe("shopping:add");
    expect(passthrough.queuedMutations).toHaveLength(0);
  });

  it("normalizes duty fixed assignee to active participants", () => {
    const template = buildTemplate();
    const members = [buildMember("member-1"), buildMember("member-2"), buildMember("member-3")];
    const normalized = normalizeTemplateSchedule(template, members, {
      fixedAssigneeId: "member-unknown",
      participantMemberIds: ["member-2", "member-3"]
    });

    expect(normalized.fixedAssigneeId).toBe("member-2");
    expect(normalized.participantMemberIds).toEqual(["member-2", "member-3"]);
    expect(normalized.rotationOrder).toEqual(["member-2", "member-3"]);
  });

  it("rebuilds future devotions while honoring skipped weekdays", () => {
    const workspace = buildWorkspace();
    const tomorrowWeekday = addDays(new Date(), 1).getDay();
    const updated = rebuildFutureDevotions(workspace, {
      devotionSkipWeekdays: [tomorrowWeekday]
    });

    const tomorrowKey = formatISO(addDays(new Date(), 1), { representation: "date" });
    expect(updated.some((entry) => entry.date === tomorrowKey)).toBe(false);
  });
});
