import { format, isToday, parseISO } from "date-fns";
import type {
  AssignmentKind,
  DeviceNotificationTask,
  NotificationLifecycleState,
  ReminderSeverity,
  ReminderState
} from "@/data/types";

type NotificationCopySource = Pick<
  DeviceNotificationTask,
  "id" | "kind" | "title" | "summary" | "description" | "dueAt" | "memberName"
>;

interface NotificationCopy {
  title: string;
  body: string;
}

interface CompletionFeedbackCopy extends NotificationCopy {
  severity: ReminderSeverity;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function pickVariant<T>(variants: readonly T[], seed: string) {
  return variants[hashString(seed) % variants.length] ?? variants[0];
}

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function withSentenceEnding(value: string) {
  const normalized = cleanText(value);

  if (!normalized) {
    return "";
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function joinSentences(...parts: Array<string | null | undefined>) {
  return parts
    .map((part) => withSentenceEnding(part ?? ""))
    .filter(Boolean)
    .join(" ");
}

function preferredName(fullName: string) {
  const normalized = cleanText(fullName);

  if (!normalized) {
    return "there";
  }

  return normalized.split(/\s+/)[0] ?? normalized;
}

function dueTimeLabel(dueAt: string) {
  return format(parseISO(dueAt), "h:mm a");
}

function dueDayLabel(dueAt: string) {
  const date = parseISO(dueAt);

  if (isToday(date)) {
    return `today at ${dueTimeLabel(dueAt)}`;
  }

  return format(date, "EEE 'at' h:mm a");
}

function maybeEmoji(kind: AssignmentKind, state: NotificationLifecycleState, seed: string) {
  if (state === "overdue" || state === "due" || state === "completed") {
    return "";
  }

  const variants: Record<AssignmentKind, string[]> = {
    duty: ["", "", ""],
    meal: ["", " 🍲", " 🍳"],
    devotion: ["", " 🙏", ""]
  };

  return pickVariant(variants[kind], seed);
}

function detailLine(task: NotificationCopySource) {
  const summary = cleanText(task.summary);
  const description = cleanText(task.description);

  if (summary && description) {
    return joinSentences(summary, description);
  }

  if (description) {
    return withSentenceEnding(description);
  }

  if (summary) {
    return withSentenceEnding(summary);
  }

  if (task.kind === "meal") {
    return "Open the meal plan to review what is needed.";
  }

  if (task.kind === "devotion") {
    return "Open the devotion plan to review the reading and notes.";
  }

  return "Open Famtastic to review the details.";
}

function buildDutyNotificationCopy(
  task: NotificationCopySource,
  state: NotificationLifecycleState,
  deliveryCount: number
): NotificationCopy {
  const name = preferredName(task.memberName);
  const time = dueTimeLabel(task.dueAt);
  const detail = detailLine(task);
  const emoji = maybeEmoji(task.kind, state, `${task.id}-${state}-${deliveryCount}-emoji`);

  if (state === "scheduled") {
    return {
      title: pickVariant(
        [
          `Hey ${name}, ${task.title} is coming up at ${time}${emoji}`,
          `${name}, ${task.title} is on your list for ${time}${emoji}`,
          `A quick heads-up: ${task.title} is yours at ${time}${emoji}`
        ],
        `${task.id}-${state}-${deliveryCount}-title`
      ),
      body: joinSentences(detail, `Plan to finish it ${dueDayLabel(task.dueAt)}`)
    };
  }

  if (state === "upcoming") {
    return {
      title: pickVariant(
        [
          `${name}, ${task.title} is almost due`,
          `It is nearly time for ${task.title}`,
          `${task.title} starts soon`
        ],
        `${task.id}-${state}-${deliveryCount}-title`
      ),
      body: joinSentences(detail, `It is due at ${time}`)
    };
  }

  if (state === "due") {
    return {
      title: pickVariant(
        [
          `${name}, it is time for ${task.title}`,
          `${task.title} is due now`,
          `Please handle ${task.title} now`
        ],
        `${task.id}-${state}-${deliveryCount}-title`
      ),
      body: joinSentences(detail, `This is the planned ${time} start`)
    };
  }

  const level = Math.min(deliveryCount, 3);
  const overdueTitles =
    level >= 3
      ? [
          `${task.title} still needs your attention`,
          `${name}, please close out ${task.title} now`,
          `${task.title} is still waiting`
        ]
      : level === 2
        ? [
            `${task.title} is still overdue, ${name}`,
            `${name}, please handle ${task.title} now`,
            `${task.title} has not been completed yet`
          ]
        : [
            `${task.title} is overdue, ${name}`,
            `${name}, ${task.title} has passed its due time`,
            `${task.title} is now overdue`
          ];

  return {
    title: pickVariant(overdueTitles, `${task.id}-${state}-${deliveryCount}-title`),
    body: joinSentences(detail, `It passed its ${time} due time. Please take care of it now`)
  };
}

function buildMealNotificationCopy(
  task: NotificationCopySource,
  state: NotificationLifecycleState,
  deliveryCount: number
): NotificationCopy {
  const name = preferredName(task.memberName);
  const time = dueTimeLabel(task.dueAt);
  const detail = detailLine(task);
  const emoji = maybeEmoji(task.kind, state, `${task.id}-${state}-${deliveryCount}-emoji`);

  if (state === "scheduled") {
    return {
      title: pickVariant(
        [
          `Hey ${name}, dinner is on you today: ${task.title}${emoji}`,
          `Chef ${name}, ${task.title} is yours at ${time}${emoji}`,
          `${name}, you are cooking ${task.title} today${emoji}`
        ],
        `${task.id}-${state}-${deliveryCount}-title`
      ),
      body: joinSentences(detail, `Dinner is planned for ${time}`)
    };
  }

  if (state === "upcoming") {
    return {
      title: pickVariant(
        [
          `${name}, start prep for ${task.title}`,
          `Cooking starts soon: ${task.title}`,
          `It is almost time to get ${task.title} going`
        ],
        `${task.id}-${state}-${deliveryCount}-title`
      ),
      body: joinSentences(detail, `Dinner is at ${time}, so now is a good time to begin`)
    };
  }

  if (state === "due") {
    return {
      title: pickVariant(
        [
          `${name}, it is time to start ${task.title}`,
          `Dinner is due now: ${task.title}`,
          `Please start cooking ${task.title} now`
        ],
        `${task.id}-${state}-${deliveryCount}-title`
      ),
      body: joinSentences(detail, `Dinner is scheduled for ${time}`)
    };
  }

  const level = Math.min(deliveryCount, 3);
  const overdueTitles =
    level >= 3
      ? [
          "Dinner still needs your attention",
          `${task.title} still needs you in the kitchen`,
          `${name}, dinner has still not started`
        ]
      : level === 2
        ? [
            `Dinner is still overdue - please handle ${task.title} now`,
            `${task.title} still needs you in the kitchen`,
            `${name}, cooking is still overdue`
          ]
        : [
            `Dinner is overdue - please handle ${task.title} now`,
            `${name}, cooking is now overdue`,
            `${task.title} should have started already`
          ];

  return {
    title: pickVariant(overdueTitles, `${task.id}-${state}-${deliveryCount}-title`),
    body: joinSentences(detail, `Dinner should have started at ${time}. Please handle it now`)
  };
}

function buildDevotionNotificationCopy(
  task: NotificationCopySource,
  state: NotificationLifecycleState,
  deliveryCount: number
): NotificationCopy {
  const name = preferredName(task.memberName);
  const time = dueTimeLabel(task.dueAt);
  const detail = detailLine(task);
  const emoji = maybeEmoji(task.kind, state, `${task.id}-${state}-${deliveryCount}-emoji`);

  if (state === "scheduled") {
    return {
      title: pickVariant(
        [
          `Hey ${name}, you are leading devotion tonight at ${time}${emoji}`,
          `${name}, devotion leadership is yours at ${time}${emoji}`,
          `A gentle reminder: you are leading devotion later${emoji}`
        ],
        `${task.id}-${state}-${deliveryCount}-title`
      ),
      body: joinSentences(detail, "Take a moment to review the reading and notes before the family gathers")
    };
  }

  if (state === "upcoming") {
    return {
      title: pickVariant(
        [
          `${name}, it is nearly time to lead devotion`,
          "Devotion starts soon",
          "Please get ready to lead devotion"
        ],
        `${task.id}-${state}-${deliveryCount}-title`
      ),
      body: joinSentences(detail, `The family rhythm is set for ${time}`)
    };
  }

  if (state === "due") {
    return {
      title: pickVariant(
        [
          `${name}, it is time to lead devotion`,
          "Devotion is due now",
          "Please gather the family for devotion now"
        ],
        `${task.id}-${state}-${deliveryCount}-title`
      ),
      body: joinSentences(detail, `The family is expecting the ${time} start`)
    };
  }

  const level = Math.min(deliveryCount, 3);
  const overdueTitles =
    level >= 3
      ? [
          "Devotion still needs to begin",
          `${name}, please gather the family for devotion now`,
          "Devotion is still waiting"
        ]
      : level === 2
        ? [
            "Devotion is still overdue - please begin now",
            `${name}, devotion time has already passed`,
            "Please start devotion as soon as possible"
          ]
        : [
            "Devotion is overdue - please gather the family now",
            `${name}, devotion time has passed`,
            "Please start devotion now"
          ];

  return {
    title: pickVariant(overdueTitles, `${task.id}-${state}-${deliveryCount}-title`),
    body: joinSentences(detail, `The planned start was ${time}. Please begin when you can`)
  };
}

export function buildDeviceNotificationCopy(
  task: NotificationCopySource,
  state: NotificationLifecycleState,
  deliveryCount = 1
): NotificationCopy {
  if (state === "completed") {
    const name = preferredName(task.memberName);

    return {
      title: pickVariant([`Nice work, ${name} 👏`, `${task.title} is complete`, `Thank you, ${name}`], `${task.id}-completed-title`),
      body: pickVariant(
        [
          `${task.title} has been marked complete. Thanks for keeping the family plan on track.`,
          `You finished ${task.title}. Everything is now up to date.`,
          `${task.title} is done. Thank you for following through.`
        ],
        `${task.id}-completed-body`
      )
    };
  }

  if (task.kind === "meal") {
    return buildMealNotificationCopy(task, state, deliveryCount);
  }

  if (task.kind === "devotion") {
    return buildDevotionNotificationCopy(task, state, deliveryCount);
  }

  return buildDutyNotificationCopy(task, state, deliveryCount);
}

export function buildReminderCopy(task: NotificationCopySource, state: ReminderState): NotificationCopy {
  const name = preferredName(task.memberName);
  const time = dueTimeLabel(task.dueAt);
  const detail = detailLine(task);

  if (task.kind === "meal") {
    return {
      title:
        state === "overdue"
          ? "Dinner is overdue"
          : state === "due-soon"
            ? "Start cooking soon"
            : "Dinner is on you today",
      body:
        state === "overdue"
          ? joinSentences(detail, `${name}, dinner should have started at ${time}. Please handle it now`)
          : state === "due-soon"
            ? joinSentences(detail, `Dinner is at ${time}, so it is time to start prep`)
            : joinSentences(`Hey ${name}, you are cooking ${task.title} today`, detail)
    };
  }

  if (task.kind === "devotion") {
    return {
      title:
        state === "overdue"
          ? "Devotion is overdue"
          : state === "due-soon"
            ? "Devotion starts soon"
            : "You are leading devotion tonight",
      body:
        state === "overdue"
          ? joinSentences(detail, `${name}, devotion was scheduled for ${time}. Please begin when ready`)
          : state === "due-soon"
            ? joinSentences(detail, `Keep your notes nearby for the ${time} start`)
            : joinSentences(`Hey ${name}, you are leading tonight's devotion`, detail)
    };
  }

  return {
    title:
      state === "overdue"
        ? `${task.title} is overdue`
        : state === "due-soon"
          ? `${task.title} is due soon`
          : `${task.title} later today`,
    body:
      state === "overdue"
        ? joinSentences(detail, `${name}, this passed its ${time} due time. Please close it out now`)
        : state === "due-soon"
          ? joinSentences(detail, `It is due at ${time}`)
          : joinSentences(`Hey ${name}, ${task.title} is on your list for later today`, detail)
  };
}

export function buildCompletionFeedbackCopy(memberName: string, taskTitle: string): CompletionFeedbackCopy {
  const name = preferredName(memberName);
  const seed = `${memberName}-${taskTitle}-complete`;

  return {
    title: pickVariant([`Nice work, ${name} 👏`, `Thank you, ${name}`, `${taskTitle} is complete`], `${seed}-title`),
    body: pickVariant(
      [
        `${taskTitle} has been marked complete. Thanks for keeping the day moving.`,
        `You closed out ${taskTitle}. The family plan is up to date.`,
        `${taskTitle} is done. Thank you for following through.`
      ],
      `${seed}-body`
    ),
    severity: "gentle"
  };
}

export function buildReopenFeedbackCopy(taskTitle: string): CompletionFeedbackCopy {
  return {
    title: pickVariant(["Back to pending", `${taskTitle} is open again`, "Duty reopened"], `${taskTitle}-reopen-title`),
    body: pickVariant(
      [
        `${taskTitle} is back on the list and still needs attention.`,
        `We moved ${taskTitle} back to pending so the family plan stays accurate.`,
        `${taskTitle} has been reopened and will stay visible until it is completed.`
      ],
      `${taskTitle}-reopen-body`
    ),
    severity: "important"
  };
}

export function buildNotificationPreviewCopy(memberName: string) {
  const name = preferredName(memberName);

  return {
    title: pickVariant(
      [
        `Hey ${name}, dinner is on you today: Rice and lentil stew 🍲`,
        `${name}, you are leading devotion tonight at 8:00 PM 🙏`,
        `${name}, Dishwashing is due soon`
      ],
      `${memberName}-preview-title`
    ),
    body: pickVariant(
      [
        "Famtastic keeps the next important family responsibility visible and easy to act on.",
        "Reminders stay clear, warm, and hard to miss without feeling noisy.",
        "Open Famtastic to see what needs your attention today."
      ],
      `${memberName}-preview-body`
    )
  };
}
