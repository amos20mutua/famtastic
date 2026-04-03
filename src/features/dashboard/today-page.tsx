import { parseISO } from "date-fns";
import { BellRing, CheckCircle2, Download, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/shared/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusPill } from "@/components/shared/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Panel } from "@/components/ui/card";
import { formatCalendarLabel, formatClock, formatRelativeWindow, formatShortDate } from "@/lib/date";
import { useAppState } from "@/state/app-state";

function reminderTone(state: "upcoming" | "due-soon" | "overdue") {
  if (state === "overdue") {
    return "critical" as const;
  }

  if (state === "due-soon") {
    return "warm" as const;
  }

  return "default" as const;
}

function targetForReminder(kind: "duty" | "devotion" | "meal", relatedId: string) {
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
    installReady,
    promptInstall,
    requestBrowserNotifications,
    markDutyComplete,
    canManageSchedules,
    isOnline,
    syncState
  } = useAppState();

  const myReminders = reminders.filter((reminder) => reminder.assigneeId === currentUser?.id);
  const primaryReminders = (myReminders.length > 0 ? myReminders : reminders).slice(0, 3);
  const overdueCount = reminders.filter((reminder) => reminder.state === "overdue").length;
  const nextResponsibility = reminders.find((reminder) => reminder.assigneeId === currentUser?.id) ?? null;
  const todayLeader = familyMembers.find((member) => member.id === todayDevotion?.leaderId) ?? null;
  const todayCook = familyMembers.find((member) => member.id === todayMeal?.cookId) ?? null;

  const summaryRows = [
    {
      label: "Devotion tonight",
      value: todayLeader?.displayName ?? "Not set",
      detail: todayDevotion ? `${todayDevotion.topic} at ${todayDevotion.time}` : "Set the leader and reading."
    },
    {
      label: "Cooking today",
      value: todayCook?.displayName ?? "Not assigned",
      detail: todayMeal?.title ?? "Add a meal so dinner stays visible."
    },
    {
      label: "Open duties",
      value: `${todayDutyAssignments.length}`,
      detail: nextResponsibility ? `${nextResponsibility.title} is next for you.` : "No open responsibility right now."
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-5">
      <Panel className="overflow-hidden px-3.5 py-4 sm:px-5 sm:py-6 md:px-6 md:py-7">
        <div className="grid gap-3 sm:gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-3">
            <PageHeader
              eyebrow="Today"
              title={`Everything that matters today, ${currentUser?.displayName?.split(" ")[0] ?? "friend"}.`}
              description="See the devotion plan, cooking ownership, open duties, and overdue follow-through in one calm place."
              actions={
                <>
                  <Badge tone={overdueCount > 0 ? "critical" : "success"}>
                    {overdueCount > 0 ? `${overdueCount} overdue` : "On track"}
                  </Badge>
                  <Badge tone={isOnline ? "success" : "critical"}>{isOnline ? syncState : "Offline mode"}</Badge>
                </>
              }
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {installReady ? (
                <Button className="w-full sm:w-auto" onClick={() => void promptInstall()}>
                  Install Famtastic
                  <Download className="h-4 w-4" />
                </Button>
              ) : null}
              <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void requestBrowserNotifications()}>
                Enable visible reminders
                <BellRing className="h-4 w-4" />
              </Button>
            </div>

            {!isOnline ? (
              <div className="surface-soft p-3 text-sm leading-6 text-slatewarm-700 sm:p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-slatewarm-900">
                  <WifiOff className="h-4 w-4 text-slatewarm-600" />
                  Offline-friendly mode is active
                </div>
                Duties and recent schedules stay visible, and queued changes will sync when your connection returns.
              </div>
            ) : null}
          </div>

          <Card className="space-y-3 bg-white/84 sm:space-y-4">
            <div className="space-y-2">
              <p className="section-label">Today at a glance</p>
              <h2 className="section-title max-w-sm">A quick picture of the day.</h2>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {summaryRows.map((row) => (
                <div className="surface-soft flex items-start justify-between gap-3 p-3 sm:p-4" key={row.label}>
                  <div className="min-w-0 space-y-1.5">
                    <p className="meta-copy font-medium">{row.label}</p>
                    <p className="text-[1.05rem] font-semibold text-slatewarm-900">{row.value}</p>
                    <p className="body-copy">{row.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="surface-soft px-3.5 py-2.5 sm:px-4 sm:py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slatewarm-900">Overdue follow-through</p>
                  <p className="body-copy mt-1">
                    {overdueCount > 0
                      ? `${overdueCount} responsibilities still need visible completion.`
                      : "Nothing overdue right now."}
                  </p>
                </div>
                <StatusPill label={overdueCount > 0 ? "attention needed" : "clear"} tone={overdueCount > 0 ? "critical" : "success"} />
              </div>
            </div>
          </Card>
        </div>
      </Panel>

      <div className="grid gap-3 sm:gap-5 lg:grid-cols-[1.04fr_0.96fr]">
        <Card className="space-y-3">
          <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-label">Today's duties</p>
              <h2 className="section-title mt-2">Open responsibilities</h2>
            </div>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => navigate("/app/duties")}>
              See all duties
            </Button>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {todayDutyAssignments.length > 0 ? (
              todayDutyAssignments.map((assignment) => {
                const member = familyMembers.find((item) => item.id === assignment.assignedTo);
                const overdue = parseISO(assignment.dueAt) < new Date();
                const canComplete = assignment.assignedTo === currentUser?.id || canManageSchedules;

                return (
                  <div className="surface-tile p-3 sm:p-4" key={assignment.id}>
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1.5 sm:space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-slatewarm-900">{assignment.title}</p>
                          <StatusPill label={overdue ? "overdue" : "today"} tone={overdue ? "critical" : "warm"} />
                          {assignment.assignmentSource === "temporary-cover" ? <Badge tone="warm">Temporary cover</Badge> : null}
                          {assignment.assignmentSource === "rotation-shift" ? <Badge tone="default">Rotation shift</Badge> : null}
                        </div>
                        <p className="body-copy">{assignment.description}</p>
                        <div className="meta-row">
                          <span>{formatClock(assignment.dueAt)}</span>
                          <span>{formatRelativeWindow(assignment.dueAt)}</span>
                          {assignment.overrideNote ? <span>{assignment.overrideNote}</span> : null}
                        </div>
                      </div>

                      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
                        {member ? <Avatar member={member} size="sm" /> : null}
                        {canComplete ? (
                          <Button className="w-full sm:w-auto" onClick={() => markDutyComplete(assignment.id)}>
                            Mark done
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No open duties today"
                description="When the next responsibility becomes due, it will appear here with the assigned family member."
              />
            )}
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-label">Reminder stack</p>
              <h2 className="section-title mt-2">What still needs attention</h2>
            </div>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => navigate("/app/notifications")}>
              Open reminders
            </Button>
          </div>

          {primaryReminders.length > 0 ? (
            <div className="grid gap-2.5 sm:gap-3">
              {primaryReminders.map((reminder) => {
                const assignedMember = familyMembers.find((member) => member.id === reminder.assigneeId);

                return (
                  <div className="surface-tile p-3 sm:p-4" key={reminder.id}>
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2.5 sm:space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill label={reminder.state.replace("-", " ")} tone={reminderTone(reminder.state)} />
                          <Badge tone="muted">{formatRelativeWindow(reminder.dueAt)}</Badge>
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-base font-semibold text-slatewarm-900">{reminder.title}</h3>
                          <p className="body-copy">{reminder.body}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="default">{formatCalendarLabel(reminder.dueAt)}</Badge>
                          <Badge tone="muted">{formatClock(reminder.dueAt)}</Badge>
                        </div>
                      </div>
                      {assignedMember ? <Avatar member={assignedMember} size="sm" /> : null}
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap">
                      {reminder.kind === "duty" ? (
                        <Button className="w-full sm:w-auto" onClick={() => markDutyComplete(reminder.relatedId)}>
                          <CheckCircle2 className="h-4 w-4" />
                          Mark done
                        </Button>
                      ) : (
                        <Button
                          className="w-full sm:w-auto"
                          variant="secondary"
                          onClick={() => navigate(targetForReminder(reminder.kind, reminder.relatedId))}
                        >
                          {reminder.actionableLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No urgent reminders right now"
              description="When something becomes due soon or overdue, it will stay visible here until it is completed."
            />
          )}
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-5 lg:grid-cols-[1fr_1fr_0.9fr]">
        <Card className="space-y-3">
          <div>
            <p className="section-label">Devotion tonight</p>
            <h2 className="section-title mt-2">Leadership and reading</h2>
          </div>

          {todayDevotion && todayLeader ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar member={todayLeader} />
                <div>
                  <p className="text-base font-semibold text-slatewarm-900">{todayLeader.displayName}</p>
                  <p className="meta-copy">Leading tonight at {todayDevotion.time}</p>
                </div>
              </div>
              <div className="surface-soft p-3 sm:p-4">
                <p className="text-base font-semibold text-slatewarm-900">{todayDevotion.topic}</p>
                <p className="body-copy mt-2">{todayDevotion.bibleReading}</p>
                <p className="body-copy mt-3">{todayDevotion.notes}</p>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Devotion has not been scheduled"
              description="Set the leader, reading, and notes so tonight feels intentional before the family gathers."
            />
          )}
        </Card>

        <Card className="space-y-3">
          <div>
            <p className="section-label">Cooking today</p>
            <h2 className="section-title mt-2">Dinner ownership</h2>
          </div>

          {todayMeal && todayCook ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar member={todayCook} />
                <div>
                  <p className="text-base font-semibold text-slatewarm-900">{todayMeal.title}</p>
                  <p className="meta-copy">{todayCook.displayName} is cooking tonight</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {todayMeal.ingredients.map((ingredient) => (
                  <Badge key={ingredient} tone="muted">
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Dinner is not planned yet"
              description="Add today's meal so the cooking reminder and ingredient context stay clear for everyone."
            />
          )}
        </Card>

        <Card className="space-y-3">
          <div>
            <p className="section-label">Looking ahead</p>
            <h2 className="section-title mt-2">Coming up next</h2>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {upcomingDutyAssignments.length > 0 ? (
              upcomingDutyAssignments.map((assignment) => {
                const member = familyMembers.find((item) => item.id === assignment.assignedTo);

                return (
                  <div className="surface-tile flex flex-col items-start gap-2.5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4" key={assignment.id}>
                    <div className="space-y-1">
                      <p className="font-semibold text-slatewarm-900">{assignment.title}</p>
                      <p className="meta-copy">
                        {formatShortDate(assignment.dueAt)} at {formatClock(assignment.dueAt)}
                      </p>
                      {assignment.assignmentSource !== "rotation" && assignment.assignmentSource !== "fixed" ? (
                        <p className="meta-copy text-xs font-medium">
                          {assignment.assignmentSource === "temporary-cover" ? "Temporary cover" : "Rotation shift"}
                        </p>
                      ) : null}
                    </div>
                    {member ? <Avatar member={member} size="sm" /> : null}
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No upcoming responsibilities yet"
                description="Generate the next cycle to extend duties forward without losing the family rhythm."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
