import { parseISO } from "date-fns";
import { BellRing, CheckCircle2, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/shared/avatar";
import { StatusPill } from "@/components/shared/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatClock, formatRelativeWindow, formatShortDate } from "@/lib/date";
import { useAppState } from "@/state/app-state";

type ReminderState = "upcoming" | "due-soon" | "overdue";
type TodayItemKind = "duty" | "meal" | "devotion";

interface SecondaryItem {
  kind: TodayItemKind;
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  status: ReminderState;
  target: string;
  actionLabel: string;
  completionId: string | null;
}

function stateTone(state: ReminderState) {
  if (state === "overdue") {
    return "critical" as const;
  }

  if (state === "due-soon") {
    return "warm" as const;
  }

  return "default" as const;
}

function statePriority(state: ReminderState) {
  if (state === "overdue") {
    return 0;
  }

  if (state === "due-soon") {
    return 1;
  }

  return 2;
}

function stateLabel(state: ReminderState) {
  if (state === "due-soon") {
    return "due soon";
  }

  return state;
}

function targetForItem(kind: TodayItemKind, relatedId: string) {
  if (kind === "duty") {
    return `/app/duties?focus=${relatedId}`;
  }

  if (kind === "meal") {
    return `/app/meals?focus=${relatedId}`;
  }

  return `/app/devotions?focus=${relatedId}`;
}

export function TodayPage() {
  const navigate = useNavigate();
  const {
    currentUser,
    familyMembers,
    todayDutyAssignments,
    todayDevotion,
    todayMeal,
    upcomingDutyAssignments,
    reminders,
    requestBrowserNotifications,
    markDutyComplete,
    canManageSchedules,
    isOnline,
    notificationPermission
  } = useAppState();

  const firstName = currentUser?.displayName?.split(" ")[0] ?? "friend";
  const myReminders = reminders.filter((reminder) => reminder.assigneeId === currentUser?.id);
  const relevantReminders = (myReminders.length > 0 ? myReminders : reminders)
    .slice()
    .sort((left, right) => {
      const stateComparison = statePriority(left.state) - statePriority(right.state);

      if (stateComparison !== 0) {
        return stateComparison;
      }

      return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    });
  const reminderLookup = new Map(relevantReminders.map((reminder) => [`${reminder.kind}:${reminder.relatedId}`, reminder]));
  const overdueItems = relevantReminders.filter((reminder) => reminder.state === "overdue");
  const todayLeader = familyMembers.find((member) => member.id === todayDevotion?.leaderId) ?? null;
  const todayCook = familyMembers.find((member) => member.id === todayMeal?.cookId) ?? null;

  const rankedDuties = todayDutyAssignments
    .slice()
    .sort((left, right) => {
      const leftState = (reminderLookup.get(`duty:${left.id}`)?.state ??
        (parseISO(left.dueAt) < new Date() ? "overdue" : "upcoming")) as ReminderState;
      const rightState = (reminderLookup.get(`duty:${right.id}`)?.state ??
        (parseISO(right.dueAt) < new Date() ? "overdue" : "upcoming")) as ReminderState;
      const stateComparison = statePriority(leftState) - statePriority(rightState);

      if (stateComparison !== 0) {
        return stateComparison;
      }

      return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    });

  const primaryDuty = rankedDuties[0] ?? null;
  const primaryDutyReminder = primaryDuty ? reminderLookup.get(`duty:${primaryDuty.id}`) ?? null : null;
  const mealReminder = todayMeal ? reminderLookup.get(`meal:${todayMeal.id}`) ?? null : null;
  const devotionReminder = todayDevotion ? reminderLookup.get(`devotion:${todayDevotion.id}`) ?? null : null;

  const primaryFocus = primaryDuty
    ? {
        kind: "duty" as const,
        id: primaryDuty.id,
        title: primaryDuty.title,
        detail:
          primaryDuty.title.toLowerCase().includes("cook") && todayMeal
            ? `${primaryDuty.description} Tonight's meal is ${todayMeal.title}.`
            : primaryDuty.description,
        timeLabel: formatClock(primaryDuty.dueAt),
        supportingLabel: formatRelativeWindow(primaryDuty.dueAt),
        status: (primaryDutyReminder?.state ??
          (parseISO(primaryDuty.dueAt) < new Date() ? "overdue" : "upcoming")) as ReminderState,
        assigneeName: familyMembers.find((member) => member.id === primaryDuty.assignedTo)?.displayName ?? "Family member",
        actionableLabel: primaryDuty.assignedTo === currentUser?.id || canManageSchedules ? "Mark as done" : "Open task",
        target: targetForItem("duty", primaryDuty.id),
        completionId: primaryDuty.assignedTo === currentUser?.id || canManageSchedules ? primaryDuty.id : null
      }
    : todayMeal && todayCook
      ? {
          kind: "meal" as const,
          id: todayMeal.id,
          title: `Cook ${todayMeal.title}`,
          detail: `${todayCook.displayName} is handling dinner today.`,
          timeLabel: "Tonight",
          supportingLabel: todayMeal.ingredients.slice(0, 3).join(" - "),
          status: (mealReminder?.state ?? "upcoming") as ReminderState,
          assigneeName: todayCook.displayName,
          actionableLabel: "Open meal",
          target: targetForItem("meal", todayMeal.id),
          completionId: null
        }
      : todayDevotion && todayLeader
        ? {
            kind: "devotion" as const,
            id: todayDevotion.id,
            title: todayDevotion.topic,
            detail: `${todayLeader.displayName} is leading devotion tonight.`,
            timeLabel: todayDevotion.time,
            supportingLabel: todayDevotion.bibleReading,
            status: (devotionReminder?.state ?? "upcoming") as ReminderState,
            assigneeName: todayLeader.displayName,
            actionableLabel: "Open devotion",
            target: targetForItem("devotion", todayDevotion.id),
            completionId: null
          }
        : null;

  const secondaryItems: SecondaryItem[] = rankedDuties
    .filter((assignment) => assignment.id !== primaryDuty?.id)
    .map((assignment) => {
      const state = (reminderLookup.get(`duty:${assignment.id}`)?.state ??
        (parseISO(assignment.dueAt) < new Date() ? "overdue" : "upcoming")) as ReminderState;
      const assignee = familyMembers.find((member) => member.id === assignment.assignedTo)?.displayName ?? "Family member";

      return {
        kind: "duty" as const,
        id: assignment.id,
        title: assignment.title,
        detail: `${assignee} - ${assignment.description}`,
        timeLabel: formatClock(assignment.dueAt),
        status: state,
        target: targetForItem("duty", assignment.id),
        actionLabel: assignment.assignedTo === currentUser?.id || canManageSchedules ? "Done" : "Open",
        completionId: assignment.assignedTo === currentUser?.id || canManageSchedules ? assignment.id : null
      };
    });

  if (todayMeal && todayCook && primaryFocus?.kind !== "meal") {
    secondaryItems.push({
      kind: "meal",
      id: todayMeal.id,
      title: `Cooking: ${todayMeal.title}`,
      detail: `${todayCook.displayName} - ${todayMeal.ingredients.slice(0, 2).join(" - ") || "Dinner plan is ready"}`,
      timeLabel: "Tonight",
      status: (mealReminder?.state ?? "upcoming") as ReminderState,
      target: targetForItem("meal", todayMeal.id),
      actionLabel: "View",
      completionId: null
    });
  }

  if (todayDevotion && todayLeader && primaryFocus?.kind !== "devotion") {
    secondaryItems.push({
      kind: "devotion",
      id: todayDevotion.id,
      title: `Devotion: ${todayDevotion.topic}`,
      detail: `${todayLeader.displayName} - ${todayDevotion.bibleReading}`,
      timeLabel: todayDevotion.time,
      status: (devotionReminder?.state ?? "upcoming") as ReminderState,
      target: targetForItem("devotion", todayDevotion.id),
      actionLabel: "View",
      completionId: null
    });
  }

  secondaryItems.sort((left, right) => statePriority(left.status) - statePriority(right.status));
  const visibleSecondaryItems = secondaryItems.slice(0, 4);
  const hiddenSecondaryCount = Math.max(0, secondaryItems.length - visibleSecondaryItems.length);

  const upcomingItems = upcomingDutyAssignments
    .slice()
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())
    .slice(0, 3);

  const activeItemCount = (primaryFocus ? 1 : 0) + secondaryItems.length;
  const personalCount =
    rankedDuties.filter((assignment) => assignment.assignedTo === currentUser?.id).length +
    (todayMeal?.cookId === currentUser?.id ? 1 : 0) +
    (todayDevotion?.leaderId === currentUser?.id ? 1 : 0);

  const summaryText = primaryFocus
    ? overdueItems.length > 0
      ? `${overdueItems.length} ${overdueItems.length === 1 ? "item needs" : "items need"} attention today.`
      : personalCount > 0
        ? `${personalCount} ${personalCount === 1 ? "responsibility is" : "responsibilities are"} on your plate today.`
        : `${activeItemCount} ${activeItemCount === 1 ? "family item is" : "family items are"} active today.`
    : "Nothing urgent right now.";

  const showSetupActions = notificationPermission !== "granted";
  const showStatusStrip = overdueItems.length > 0 || !isOnline;
  const quickAction =
    overdueItems.length > 0
      ? { label: "Open reminders", onClick: () => navigate("/app/notifications") }
      : hiddenSecondaryCount > 0
        ? { label: "Open full plan", onClick: () => navigate("/app/duties") }
        : todayMeal
          ? { label: "Open meals", onClick: () => navigate("/app/meals") }
          : { label: "All duties", onClick: () => navigate("/app/duties") };
  const primaryCompletionId = primaryFocus?.completionId ?? null;

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="section-label">Today</p>
            <h1 className="font-display text-[1.72rem] font-semibold leading-[0.96] tracking-[-0.036em] text-slatewarm-900 sm:text-[2.08rem]">
              Hi, {firstName}.
            </h1>
            <p className="max-w-xl text-[13px] leading-[1.6] text-slatewarm-700 sm:text-[14px] sm:leading-[1.66]">{summaryText}</p>
          </div>
          {currentUser ? <Avatar member={currentUser} size="sm" /> : null}
        </div>

        {showStatusStrip ? (
          <div className="flex flex-wrap gap-2">
            {overdueItems.length > 0 ? <Badge tone="critical">{overdueItems.length} overdue</Badge> : null}
            {!isOnline ? <Badge tone="critical">Offline mode</Badge> : null}
          </div>
        ) : null}

        {showSetupActions ? (
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-[36px] rounded-full px-3 text-[12px] sm:min-h-[40px] sm:text-[13px]"
              variant="secondary"
              onClick={() => void requestBrowserNotifications()}
            >
              <BellRing className="h-4 w-4" />
              Enable reminders
            </Button>
          </div>
        ) : null}

        {!isOnline ? (
          <div className="surface-soft flex items-start gap-3 px-3 py-2.5 sm:px-4">
            <WifiOff className="mt-0.5 h-4 w-4 text-slatewarm-600" />
            <p className="body-copy">Today stays visible offline, and any changes will sync when your connection comes back.</p>
          </div>
        ) : null}
      </section>

      <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="overflow-hidden border-pine-100 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(230,239,234,0.72)_100%)] shadow-[0_24px_52px_-34px_rgba(31,61,43,0.16)]">
          {primaryFocus ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <p className="section-label text-brand">Primary focus</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill label={stateLabel(primaryFocus.status)} tone={stateTone(primaryFocus.status)} />
                    <p className="text-[12px] font-medium text-slatewarm-600">
                      {primaryFocus.timeLabel}
                      {primaryFocus.supportingLabel ? ` - ${primaryFocus.supportingLabel}` : ""}
                    </p>
                  </div>
                </div>
                <div className="surface-pill px-2.5 py-1.5">
                  <p className="meta-copy font-medium text-slatewarm-700">{primaryFocus.assigneeName}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-[1.66rem] font-semibold leading-[0.98] tracking-[-0.036em] text-slatewarm-900 sm:text-[2.02rem]">
                  {primaryFocus.title}
                </h2>
                <p className="text-[13px] leading-[1.66] text-slatewarm-700 sm:text-[14px] sm:leading-[1.72]">{primaryFocus.detail}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {primaryCompletionId !== null ? (
                  <Button className="w-full sm:w-auto" onClick={() => markDutyComplete(primaryCompletionId)}>
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as done
                  </Button>
                ) : (
                  <Button className="w-full sm:w-auto" onClick={() => navigate(primaryFocus.target)}>
                    {primaryFocus.actionableLabel}
                  </Button>
                )}
                {primaryCompletionId === null ? null : (
                  <Button className="w-full sm:w-auto" variant="secondary" onClick={() => navigate(primaryFocus.target)}>
                    Open details
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="section-label text-brand">Primary focus</p>
              <h2 className="text-[1.48rem] font-semibold leading-[1] tracking-[-0.034em] text-slatewarm-900">Nothing urgent right now.</h2>
              <p className="body-copy">The day is calm. Keep an eye on the upcoming queue and any reminders that appear later.</p>
            </div>
          )}
        </Card>

        <div className="space-y-4 xl:pl-1">
            <section className="space-y-2.5">
              <div className="flex items-end justify-between gap-3 px-0.5">
                <div>
                  <p className="section-label">Next up</p>
                  <h2 className="mt-1 text-[0.98rem] font-semibold text-slatewarm-900">Everything else that needs attention</h2>
                </div>
                <Badge tone="muted">{secondaryItems.length}</Badge>
              </div>

            {secondaryItems.length > 0 ? (
              <div className="border-y border-slatewarm-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.48)_0%,rgba(255,255,255,0.82)_100%)]">
                {visibleSecondaryItems.map((item, index) => {
                  const completionId = item.completionId;

                  return (
                    <div
                      className={cn(
                        "flex items-start gap-3 px-0.5 py-3",
                        index !== secondaryItems.length - 1 && "border-b border-slatewarm-100/90"
                      )}
                      key={`${item.kind}-${item.id}`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slatewarm-900">{item.title}</p>
                          <StatusPill className="text-[10px]" label={stateLabel(item.status)} tone={stateTone(item.status)} />
                        </div>
                        <p className="text-[12px] leading-5 text-slatewarm-600">{item.detail}</p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="text-[12px] font-medium text-slatewarm-600">{item.timeLabel}</p>
                        <button
                          className={cn("interactive-link text-[12px] font-semibold", completionId !== null ? "text-brand" : "text-slatewarm-700")}
                          onClick={() => (completionId !== null ? markDutyComplete(completionId) : navigate(item.target))}
                          type="button"
                        >
                          {item.actionLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {hiddenSecondaryCount > 0 ? (
                  <button
                    className="interactive-link flex w-full items-center justify-between px-0.5 py-3 text-left"
                    onClick={() => navigate("/app/duties")}
                    type="button"
                  >
                    <span className="text-[12px] font-semibold text-slatewarm-900">View {hiddenSecondaryCount} more in duties</span>
                    <span className="text-[12px] font-semibold text-brand">Open</span>
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="border-t border-slatewarm-100/90 px-0.5 py-3">
                <p className="body-copy">No other tasks are competing for attention right now.</p>
              </div>
            )}
          </section>

          {upcomingItems.length > 0 ? (
            <section className="space-y-2.5 border-t border-slatewarm-100/90 pt-3">
              <div className="flex items-end justify-between gap-3 px-0.5">
                <div>
                  <p className="section-label">After that</p>
                  <h2 className="mt-1 text-[0.98rem] font-semibold text-slatewarm-900">Coming next</h2>
                </div>
                <p className="text-[12px] font-medium text-slatewarm-500">{upcomingItems.length} queued</p>
              </div>
              <div className="space-y-2">
                {upcomingItems.map((assignment) => (
                  <div className="flex items-start justify-between gap-3 px-0.5 py-1.5" key={assignment.id}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slatewarm-900">{assignment.title}</p>
                      <p className="meta-copy">
                        {formatShortDate(assignment.dueAt)} at {formatClock(assignment.dueAt)}
                      </p>
                    </div>
                    <Badge tone="muted">{familyMembers.find((member) => member.id === assignment.assignedTo)?.displayName ?? "Family"}</Badge>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <Button
        className="fixed bottom-[calc(5.1rem+env(safe-area-inset-bottom))] right-3 z-20 rounded-full px-4 shadow-float xl:hidden"
        onClick={quickAction.onClick}
      >
        {quickAction.label}
      </Button>
    </div>
  );
}
