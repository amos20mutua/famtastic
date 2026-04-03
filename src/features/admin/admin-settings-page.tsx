import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCalendarLabel, formatClock } from "@/lib/date";
import { useAppState } from "@/state/app-state";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function toneForAction(action: string) {
  if (action === "reject" || action === "delete" || action === "archive") {
    return "critical" as const;
  }

  if (action === "approve" || action === "complete") {
    return "success" as const;
  }

  if (action === "reassign" || action === "settings-update" || action === "role-change") {
    return "warm" as const;
  }

  return "muted" as const;
}

export function AdminSettingsPage() {
  const {
    workspace,
    isAdmin,
    currentUser,
    canManageSchedules,
    canManageReminderRules,
    canReviewRequests,
    canViewAuditHistory,
    visibleChangeRequests,
    reviewChangeRequest,
    updateReminderSettings,
    toggleDevotionSkipWeekday,
    generateNextWeek,
    resetDemoWorkspace,
    familyMembers
  } = useAppState();
  const [dueSoonMinutes, setDueSoonMinutes] = useState(workspace?.settings.reminderSettings.dueSoonMinutes ?? 60);
  const [escalationMinutes, setEscalationMinutes] = useState(workspace?.settings.reminderSettings.escalationMinutes ?? 30);
  const [upcomingWindowHours, setUpcomingWindowHours] = useState(workspace?.settings.reminderSettings.upcomingWindowHours ?? 18);

  const pendingRequests = visibleChangeRequests.filter((request) => request.status === "pending");
  const myRequests = visibleChangeRequests.filter((request) => request.requestedById === currentUser?.id);
  const recentAuditLogs = canViewAuditHistory ? workspace?.auditLogs.slice(0, 14) ?? [] : [];

  if (!(canManageReminderRules || canReviewRequests || canViewAuditHistory || canManageSchedules)) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Requests"
          title="Your contributions stay visible, even when structure stays protected."
          description="Members can follow their submitted requests here without directly changing schedules, reminder rules, or family governance."
        />

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">Your request history</p>
              <h2 className="section-title mt-2">Pending and resolved requests</h2>
            </div>
            <Badge tone={myRequests.some((request) => request.status === "pending") ? "warm" : "muted"}>
              {myRequests.length} total
            </Badge>
          </div>

          <div className="space-y-3">
            {myRequests.length > 0 ? (
              myRequests.map((request) => {
                const reviewer = familyMembers.find((member) => member.id === request.reviewedById);

                return (
                  <div className="surface-tile p-4" key={request.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slatewarm-900">{request.title}</p>
                          <Badge tone={request.status === "approved" ? "success" : request.status === "rejected" ? "critical" : "warm"}>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="body-copy">{request.details}</p>
                        <p className="meta-copy">
                          {formatCalendarLabel(request.createdAt)} at {formatClock(request.createdAt)}
                        </p>
                        {request.reviewedAt ? (
                          <p className="meta-copy">
                            Reviewed by {reviewer?.displayName ?? "family governance"} on {formatCalendarLabel(request.reviewedAt)}.
                          </p>
                        ) : null}
                        {request.resolutionNote ? <p className="body-copy">{request.resolutionNote}</p> : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="surface-soft rounded-3xl p-4 text-sm leading-6 text-slatewarm-700">
                When you request a swap or suggest a planning change, it will appear here until a parent or co-admin resolves it.
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
      <div className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="Central control, shared visibility, and a clean audit trail."
        description="Famtastic keeps the household visible to everyone without letting structure drift. Approvals, protected settings, and change history all live here."
        actions={
          <>
            <Badge tone={isAdmin ? "default" : "warm"}>{isAdmin ? "Primary admin" : "Governance access"}</Badge>
            <Badge tone="muted">Invite code: {workspace?.family?.inviteCode}</Badge>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {canManageReminderRules ? (
          <Card className="space-y-4">
            <div>
              <p className="section-label">Reminder controls</p>
              <h2 className="section-title mt-2">Tune visibility and escalation</h2>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="field-label">Due-soon window (minutes)</label>
                <Input type="number" value={dueSoonMinutes} onChange={(event) => setDueSoonMinutes(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="field-label">Escalation after overdue (minutes)</label>
                <Input type="number" value={escalationMinutes} onChange={(event) => setEscalationMinutes(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="field-label">Upcoming visibility window (hours)</label>
                <Input type="number" value={upcomingWindowHours} onChange={(event) => setUpcomingWindowHours(Number(event.target.value))} />
              </div>
              <Button
                onClick={() =>
                  void updateReminderSettings({
                    dueSoonMinutes,
                    escalationMinutes,
                    upcomingWindowHours
                  })
                }
              >
                Save reminder settings
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="space-y-4">
            <div>
              <p className="section-label">Governance model</p>
              <h2 className="section-title mt-2">Everyone participates, not everyone governs.</h2>
            </div>
            <p className="section-copy">
              Reminder rules and family structure remain with the primary admin. Co-admin support is designed into the model, but sensitive household controls still stay deliberate.
            </p>
          </Card>
        )}

        <Card className="space-y-4">
          <div>
            <p className="section-label">Scheduling controls</p>
            <h2 className="section-title mt-2">Keep the rhythm moving</h2>
          </div>

          <div className="space-y-3">
            {canManageSchedules ? (
              <Button className="w-full" variant="secondary" onClick={generateNextWeek}>
                Generate next week of rotations
              </Button>
            ) : null}
            {isAdmin ? (
              <Button className="w-full" variant="soft" onClick={() => void resetDemoWorkspace()}>
                Reset seeded demo workspace
              </Button>
            ) : null}
            <div className="surface-soft p-4 text-sm leading-6 text-slatewarm-700">
              <p className="font-semibold text-slatewarm-900">Devotion rest days</p>
              <p className="body-copy mt-1">Skipped devotion days stay restful without consuming the leadership rotation.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {weekdayLabels.map((label, index) => {
                  const selected = workspace?.settings.devotionSkipWeekdays.includes(index) ?? false;

                  return (
                    <Button
                      className="min-w-[3.25rem] px-3 py-2 text-xs"
                      key={label}
                      variant={selected ? "secondary" : "ghost"}
                      onClick={() => void toggleDevotionSkipWeekday(index)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="surface-soft p-4 text-sm leading-6 text-slatewarm-700">
              <p className="font-semibold text-slatewarm-900">Current shopping categories</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {workspace?.settings.shoppingCategories.map((category) => (
                  <Badge key={category} tone="muted">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {canReviewRequests ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">Approvals</p>
              <h2 className="section-title mt-2">Pending member requests</h2>
            </div>
            <Badge tone={pendingRequests.length > 0 ? "warm" : "success"}>
              {pendingRequests.length > 0 ? `${pendingRequests.length} pending` : "All clear"}
            </Badge>
          </div>

          <div className="grid gap-3">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request) => {
                const requester = familyMembers.find((member) => member.id === request.requestedById);
                const requestedMember = familyMembers.find((member) => member.id === request.requestedForMemberId);

                return (
                  <div className="surface-tile p-4" key={request.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slatewarm-900">{request.title}</p>
                          <Badge tone="warm">{request.type}</Badge>
                        </div>
                        <p className="body-copy">{request.details}</p>
                        <div className="flex flex-wrap gap-3 text-sm text-slatewarm-600">
                          <span>Requested by {requester?.displayName ?? "Family member"}</span>
                          {requestedMember ? <span>Suggested: {requestedMember.displayName}</span> : null}
                          <span>{formatCalendarLabel(request.createdAt)}</span>
                          <span>{formatClock(request.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => reviewChangeRequest(request.id, "approved", "Approved from governance center.")}>
                          Approve
                        </Button>
                        <Button variant="soft" onClick={() => reviewChangeRequest(request.id, "rejected", "Please keep the current plan for now.")}>
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="surface-soft rounded-3xl p-4 text-sm leading-6 text-slatewarm-700">
                No pending requests right now. Member suggestions and swap requests will appear here for review.
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {canViewAuditHistory ? (
        <Card className="space-y-4">
          <div>
            <p className="section-label">Audit history</p>
            <h2 className="section-title mt-2">What changed, who changed it, and when</h2>
          </div>

          <div className="space-y-3">
            {recentAuditLogs.map((entry) => {
              const actor = familyMembers.find((member) => member.id === entry.actorId);

              return (
                <div className="surface-tile p-4" key={entry.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slatewarm-900">{entry.summary}</p>
                        <Badge tone={toneForAction(entry.action)}>{entry.action}</Badge>
                      </div>
                      <p className="body-copy">{`${actor?.displayName ?? "System"} - ${entry.entityType}`}</p>
                      <p className="meta-copy">
                        {formatCalendarLabel(entry.createdAt)} at {formatClock(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
