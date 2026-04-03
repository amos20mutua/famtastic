import { useState } from "react";
import { Avatar } from "@/components/shared/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { StatusPill } from "@/components/shared/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DutyOverrideMode, DutyTemplate } from "@/data/types";
import { useFocusTarget } from "@/hooks/use-focus-target";
import { formatCalendarLabel, formatClock } from "@/lib/date";
import { getDutyParticipantIds, getNextRotationMemberId } from "@/lib/rotations";
import { useAppState } from "@/state/app-state";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function describeDutyCadence(template: DutyTemplate) {
  if (template.recurrence === "daily") {
    return template.intervalDays === 1 ? "Daily" : `${template.intervalDays}d`;
  }

  if (template.recurrence === "weekdays") {
    return "Weekdays";
  }

  if (template.recurrence === "weekly") {
    return template.intervalDays <= 7 ? "Weekly" : `${Math.max(1, Math.round(template.intervalDays / 7))}w`;
  }

  return template.intervalDays === 1 ? "Custom" : `${template.intervalDays}d`;
}

function getTemplateQueue(template: DutyTemplate, memberIds: string[]) {
  const participantIds = template.participantMemberIds.length > 0 ? template.participantMemberIds.filter((memberId) => memberIds.includes(memberId)) : memberIds;
  const queue = template.rotationOrder.filter((memberId) => participantIds.includes(memberId));

  participantIds.forEach((memberId) => {
    if (!queue.includes(memberId)) {
      queue.push(memberId);
    }
  });

  return queue;
}

export function DutiesPage() {
  const {
    currentUser,
    familyMembers,
    workspace,
    markDutyComplete,
    generateNextWeek,
    canManageSchedules,
    submitChangeRequest,
    updateDutyTemplateSchedule,
    moveDutyRotationMember,
    toggleDutyRotationPause,
    toggleDutyTemplateParticipant,
    toggleDutyTemplateSkipWeekday,
    resetDutyTemplateRotation,
    overrideDutyAssignment
  } = useAppState();
  const [filter, setFilter] = useState<"all" | "mine" | "overdue">("all");
  const [requestingAssignmentId, setRequestingAssignmentId] = useState<string | null>(null);
  const [requestedAssigneeId, setRequestedAssigneeId] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requestingTemplateId, setRequestingTemplateId] = useState<string | null>(null);
  const [templateRequestReason, setTemplateRequestReason] = useState("");
  const [overridingAssignmentId, setOverridingAssignmentId] = useState<string | null>(null);
  const [overrideAssigneeId, setOverrideAssigneeId] = useState("");
  const [overrideMode, setOverrideMode] = useState<DutyOverrideMode>("temporary-cover");
  const [overrideNote, setOverrideNote] = useState("");
  const { isFocused } = useFocusTarget();

  const memberIds = familyMembers.map((member) => member.id);
  const templates = workspace?.dutyTemplates.filter((template) => template.active) ?? [];
  const dutyAssignments =
    workspace?.dutyAssignments
      .filter((assignment) => assignment.status === "pending")
      .filter((assignment) => {
        if (filter === "mine") {
          return assignment.assignedTo === currentUser?.id;
        }

        if (filter === "overdue") {
          return new Date(assignment.dueAt) < new Date();
        }

        return true;
      })
      .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()) ?? [];

  const recentLogs = workspace?.completionLogs.slice().sort((left, right) => right.completedAt.localeCompare(left.completedAt)).slice(0, 8) ?? [];

  return (
    <div className="space-y-3 sm:space-y-5">
      <PageHeader
        eyebrow="Duties"
        title="See who is up and act quickly."
        description="Current person, next person, time, and the actions that matter."
        actions={
          <>
            {canManageSchedules ? (
              <Button className="w-full sm:w-auto" variant="secondary" onClick={generateNextWeek}>
                Generate next cycle
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-label">Duty plans</p>
            <h2 className="section-title mt-1">Current and next</h2>
          </div>
          <Badge tone="muted">{templates.length}</Badge>
        </div>

        <div className="grid gap-3">
          {templates.map((template) => {
            const templateAssignments =
              workspace?.dutyAssignments
                .filter((assignment) => assignment.templateId === template.id)
                .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()) ?? [];
            const currentAssignment =
              templateAssignments.find((assignment) => assignment.status === "pending") ??
              templateAssignments.at(-1) ??
              null;
            const currentMember =
              familyMembers.find((member) => member.id === currentAssignment?.assignedTo) ??
              familyMembers.find((member) => member.id === template.fixedAssigneeId) ??
              null;
            const nextMemberId =
              template.assignmentMode === "rotation"
                ? getNextRotationMemberId(template, familyMembers)
                : template.fixedAssigneeId;
            const nextMember = familyMembers.find((member) => member.id === nextMemberId) ?? null;
            const queueIds = getTemplateQueue(template, memberIds);
            const fixedAssigneeId = template.fixedAssigneeId ?? familyMembers[0]?.id ?? "";
            const participantIds = getDutyParticipantIds(template, familyMembers);

            return (
              <div className="surface-tile p-3 sm:p-3.5" key={template.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-slatewarm-900">{template.title}</h3>
                      <Badge tone={template.assignmentMode === "rotation" ? "default" : "warm"}>
                        {template.assignmentMode === "rotation" ? "Rotation" : "Fixed"}
                      </Badge>
                      <Badge tone="muted">{describeDutyCadence(template)}</Badge>
                    </div>
                    <div className="meta-row">
                      <span>Due {currentAssignment ? formatClock(currentAssignment.dueAt) : template.dueTime}</span>
                    </div>
                  </div>

                  {canManageSchedules ? (
                    <Button className="w-full sm:w-auto" variant="ghost" onClick={() => resetDutyTemplateRotation(template.id)}>
                      Reset
                    </Button>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                  <div className="surface-soft p-3 sm:p-3.5">
                    <p className="section-label">Current</p>
                    <div className="mt-2.5 flex items-center gap-3">
                      {currentMember ? <Avatar member={currentMember} size="sm" /> : null}
                      <div>
                        <p className="font-semibold text-slatewarm-900">{currentMember?.displayName ?? "Not scheduled yet"}</p>
                        <p className="meta-copy">{currentAssignment ? formatClock(currentAssignment.dueAt) : `Due ${template.dueTime}`}</p>
                      </div>
                    </div>
                  </div>

                  <div className="surface-soft p-3 sm:p-3.5">
                    <p className="section-label">Next</p>
                    <div className="mt-2.5 flex items-center gap-3">
                      {nextMember ? <Avatar member={nextMember} size="sm" /> : null}
                      <div>
                        <p className="font-semibold text-slatewarm-900">{nextMember?.displayName ?? "No one selected yet"}</p>
                        <p className="meta-copy">{template.assignmentMode === "rotation" ? "Up next" : "Current fixed person"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {template.assignmentMode === "rotation" && canManageSchedules ? (
                  <div className="surface-soft mt-4 space-y-3 p-3 sm:mt-4 sm:p-3.5">
                    <p className="text-sm font-semibold text-slatewarm-900">Order</p>

                    <div className="grid gap-2">
                      {queueIds.map((memberId, index) => {
                        const member = familyMembers.find((item) => item.id === memberId);
                        const paused = template.pausedMemberIds.includes(memberId);

                        if (!member) {
                          return null;
                        }

                        return (
                          <div
                            className="surface-tile flex flex-col gap-2.5 px-3 py-2.5 md:flex-row md:items-center md:justify-between md:px-3.5 md:py-3"
                            key={`${template.id}-queue-${memberId}`}
                          >
                            <div className="flex items-center gap-3">
                              <Badge tone="muted">#{index + 1}</Badge>
                              <Avatar member={member} size="sm" />
                              <div>
                                <p className="font-medium text-slatewarm-900">{member.displayName}</p>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {index === 0 ? <Badge tone="default">Next</Badge> : null}
                                  {paused ? <Badge tone="critical">Paused</Badge> : null}
                                </div>
                              </div>
                            </div>

                            <div className="grid w-full grid-cols-3 gap-2 md:flex md:w-auto md:flex-wrap">
                              <Button className="px-3" variant="secondary" onClick={() => moveDutyRotationMember(template.id, memberId, "up")}>
                                Up
                              </Button>
                              <Button className="px-3" variant="secondary" onClick={() => moveDutyRotationMember(template.id, memberId, "down")}>
                                Down
                              </Button>
                              <Button className="px-3" variant={paused ? "soft" : "ghost"} onClick={() => toggleDutyRotationPause(template.id, memberId)}>
                                {paused ? "Resume" : "Pause"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {canManageSchedules ? (
                  <>
                    <div className="mt-4 grid gap-3 border-t border-slatewarm-100 pt-4 md:grid-cols-2 2xl:grid-cols-5">
                      <div className="space-y-2">
                        <label className="field-label">Assignment</label>
                        <Select
                          value={template.assignmentMode}
                          onChange={(event) =>
                            updateDutyTemplateSchedule(template.id, {
                              assignmentMode: event.target.value as DutyTemplate["assignmentMode"],
                              fixedAssigneeId: fixedAssigneeId
                            })
                          }
                        >
                          <option value="rotation">Rotation queue</option>
                          <option value="fixed">Fixed assignee</option>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="field-label">Recurrence</label>
                        <Select
                          value={template.recurrence}
                          onChange={(event) =>
                            updateDutyTemplateSchedule(template.id, {
                              recurrence: event.target.value as DutyTemplate["recurrence"]
                            })
                          }
                        >
                          <option value="daily">Daily</option>
                          <option value="weekdays">Weekdays</option>
                          <option value="weekly">Weekly</option>
                          <option value="custom">Custom interval</option>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="field-label">Interval days</label>
                        <Input
                          min={1}
                          type="number"
                          value={String(template.intervalDays)}
                          onChange={(event) =>
                            updateDutyTemplateSchedule(template.id, {
                              intervalDays: Math.max(1, Number(event.target.value) || 1)
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="field-label">Starts on</label>
                        <Input
                          type="date"
                          value={template.startsOn}
                          onChange={(event) =>
                            updateDutyTemplateSchedule(template.id, {
                              startsOn: event.target.value
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="field-label">Fixed assignee</label>
                        <Select
                          disabled={template.assignmentMode !== "fixed"}
                          value={fixedAssigneeId}
                          onChange={(event) =>
                            updateDutyTemplateSchedule(template.id, {
                              fixedAssigneeId: event.target.value
                            })
                          }
                        >
                          {familyMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.displayName}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      <div className="surface-soft p-3 sm:p-3.5">
                        <p className="text-sm font-semibold text-slatewarm-900">Participant group</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {familyMembers.map((member) => {
                            const active = participantIds.includes(member.id);

                            return (
                              <Button
                                className="px-3"
                                key={`${template.id}-participant-toggle-${member.id}`}
                                variant={active ? "soft" : "secondary"}
                                onClick={() => toggleDutyTemplateParticipant(template.id, member.id)}
                              >
                                {member.displayName}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="surface-soft p-3 sm:p-3.5">
                        <p className="text-sm font-semibold text-slatewarm-900">Rest days</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {weekdayLabels.map((label, index) => (
                            <Button
                              className="px-3"
                              key={`${template.id}-weekday-${label}`}
                              variant={template.skipWeekdays.includes(index) ? "soft" : "secondary"}
                              onClick={() => toggleDutyTemplateSkipWeekday(template.id, index)}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : requestingTemplateId === template.id ? (
                  <div className="surface-soft mt-4 space-y-3 rounded-[1rem] p-3 sm:mt-4 sm:rounded-[1.2rem] sm:p-3.5">
                    <p className="text-sm font-semibold text-slatewarm-900">Request change</p>
                    <Textarea
                      placeholder="Explain what should change and why."
                      value={templateRequestReason}
                      onChange={(event) => setTemplateRequestReason(event.target.value)}
                    />
                    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                      <Button
                        className="w-full sm:w-auto"
                        onClick={() => {
                          const result = submitChangeRequest({
                            type: "schedule-change",
                            targetType: "duty-template",
                            targetId: template.id,
                            title: `Schedule change for ${template.title}`,
                            details: templateRequestReason || `Please review the schedule for ${template.title}.`,
                            proposedChanges: {
                              assignmentMode: template.assignmentMode,
                              recurrence: template.recurrence,
                              intervalDays: template.intervalDays
                            }
                          });

                          if (result.success) {
                            setRequestingTemplateId(null);
                            setTemplateRequestReason("");
                          }
                        }}
                      >
                        Submit request
                      </Button>
                      <Button
                        className="w-full sm:w-auto"
                        variant="soft"
                        onClick={() => {
                          setRequestingTemplateId(null);
                          setTemplateRequestReason("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 border-t border-slatewarm-100 pt-5">
                    <Button
                      className="w-full sm:w-auto"
                      variant="secondary"
                      onClick={() => {
                        setRequestingTemplateId(template.id);
                        setTemplateRequestReason("");
                      }}
                    >
                      Request change
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3.5">
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Button className="w-full sm:w-auto" variant={filter === "all" ? "primary" : "secondary"} onClick={() => setFilter("all")}>
            All
          </Button>
          <Button className="w-full sm:w-auto" variant={filter === "mine" ? "primary" : "secondary"} onClick={() => setFilter("mine")}>
            Mine
          </Button>
          <Button className="w-full sm:w-auto" variant={filter === "overdue" ? "primary" : "secondary"} onClick={() => setFilter("overdue")}>
            Overdue
          </Button>
        </div>

        <div className="grid gap-3">
          {dutyAssignments.map((assignment) => {
            const member = familyMembers.find((item) => item.id === assignment.assignedTo);
            const scheduledMember = familyMembers.find((item) => item.id === assignment.scheduledAssigneeId);
            const template = templates.find((item) => item.id === assignment.templateId);
            const overdue = new Date(assignment.dueAt) < new Date();
            const canComplete = assignment.assignedTo === currentUser?.id || canManageSchedules;
            const canRequestSwap = !canManageSchedules && assignment.assignedTo === currentUser?.id;
            const swapOptions = familyMembers.filter((familyMember) => familyMember.id !== assignment.assignedTo);
            const overrideOptions = familyMembers.filter((familyMember) =>
              template?.assignmentMode === "rotation"
                ? getTemplateQueue(template, memberIds).includes(familyMember.id) && familyMember.id !== assignment.assignedTo
                : familyMember.id !== assignment.assignedTo
            );

            return (
              <div
                className={`rounded-[1rem] p-2.5 outline-none transition sm:rounded-[1.2rem] sm:p-3.5 ${
                  isFocused(assignment.id) ? "surface-active" : "surface-tile"
                }`}
                data-focus-id={assignment.id}
                key={assignment.id}
                tabIndex={-1}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-slatewarm-900">{assignment.title}</h2>
                      <StatusPill label={overdue ? "overdue" : "pending"} tone={overdue ? "critical" : "warm"} />
                      {assignment.assignmentSource === "temporary-cover" ? <Badge tone="warm">Temporary cover</Badge> : null}
                      {assignment.assignmentSource === "rotation-shift" ? <Badge tone="default">Shifted</Badge> : null}
                    </div>
                    <div className="meta-row">
                      <span>{member?.displayName ?? "Family member"}</span>
                      <span>{formatCalendarLabel(assignment.dueAt)}</span>
                      <span>{formatClock(assignment.dueAt)}</span>
                      {scheduledMember && scheduledMember.id !== assignment.assignedTo ? <span>{scheduledMember.displayName} covered</span> : null}
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end">
                    {member ? (
                      <div className="surface-pill flex items-center gap-3 px-3 py-2">
                        <Avatar member={member} size="sm" />
                        <span className="field-label">{member.displayName}</span>
                      </div>
                    ) : null}
                    {canComplete ? (
                      <Button className="w-full sm:w-auto" onClick={() => markDutyComplete(assignment.id)}>
                        Mark done
                      </Button>
                    ) : null}
                    {canManageSchedules ? (
                      <Button
                        className="w-full sm:w-auto"
                        variant="secondary"
                        onClick={() => {
                          setOverridingAssignmentId(assignment.id);
                          setOverrideAssigneeId(overrideOptions[0]?.id ?? "");
                          setOverrideMode(template?.assignmentMode === "fixed" ? "temporary-cover" : "temporary-cover");
                          setOverrideNote("");
                        }}
                      >
                        Override
                      </Button>
                    ) : null}
                    {canRequestSwap ? (
                      <Button
                        className="w-full sm:w-auto"
                        variant="secondary"
                        onClick={() => {
                          setRequestingAssignmentId(assignment.id);
                          setRequestedAssigneeId(swapOptions[0]?.id ?? "");
                          setRequestReason("");
                        }}
                      >
                        Request swap
                      </Button>
                    ) : null}
                  </div>
                </div>

                {requestingAssignmentId === assignment.id ? (
                  <div className="surface-soft mt-4 space-y-3 rounded-[1rem] p-3 sm:mt-4 sm:rounded-[1.2rem] sm:p-3.5">
                    <p className="text-sm font-semibold text-slatewarm-900">Request swap</p>
                    <div className="space-y-2">
                      <label className="field-label">Suggested replacement</label>
                      <Select value={requestedAssigneeId} onChange={(event) => setRequestedAssigneeId(event.target.value)}>
                        {swapOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.displayName}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="field-label">Reason</label>
                      <Textarea
                        placeholder="Briefly explain why you need a swap."
                        value={requestReason}
                        onChange={(event) => setRequestReason(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                      <Button
                        className="w-full sm:w-auto"
                        onClick={() => {
                          const result = submitChangeRequest({
                            type: "duty-swap",
                            targetType: "duty-assignment",
                            targetId: assignment.id,
                            title: `Swap request for ${assignment.title}`,
                            details: requestReason || `Please reassign ${assignment.title}.`,
                            requestedForMemberId: requestedAssigneeId,
                            proposedChanges: {
                              assignedTo: requestedAssigneeId
                            }
                          });

                          if (result.success) {
                            setRequestingAssignmentId(null);
                            setRequestedAssigneeId("");
                            setRequestReason("");
                          }
                        }}
                      >
                        Submit request
                      </Button>
                      <Button className="w-full sm:w-auto" variant="soft" onClick={() => setRequestingAssignmentId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}

                {overridingAssignmentId === assignment.id ? (
                  <div className="surface-panel mt-4 space-y-3 p-3 sm:mt-4 sm:p-3.5">
                    <p className="text-sm font-semibold text-slatewarm-900">Override assignment</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="field-label">Replacement</label>
                        <Select value={overrideAssigneeId} onChange={(event) => setOverrideAssigneeId(event.target.value)}>
                          {overrideOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.displayName}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Override type</label>
                        <Select value={overrideMode} onChange={(event) => setOverrideMode(event.target.value as DutyOverrideMode)}>
                          <option value="temporary-cover">Temporary cover</option>
                          {template?.assignmentMode === "rotation" ? <option value="rotation-shift">Rotation shift</option> : null}
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="field-label">Note</label>
                      <Textarea
                        placeholder="Optional context for the override."
                        value={overrideNote}
                        onChange={(event) => setOverrideNote(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                      <Button
                        className="w-full sm:w-auto"
                        disabled={!overrideAssigneeId}
                        onClick={() => {
                          overrideDutyAssignment(assignment.id, {
                            assigneeId: overrideAssigneeId,
                            mode: overrideMode,
                            note: overrideNote
                          });
                          setOverridingAssignmentId(null);
                          setOverrideAssigneeId("");
                          setOverrideMode("temporary-cover");
                          setOverrideNote("");
                        }}
                      >
                        Apply override
                      </Button>
                      <Button
                        className="w-full sm:w-auto"
                        variant="soft"
                        onClick={() => {
                          setOverridingAssignmentId(null);
                          setOverrideAssigneeId("");
                          setOverrideMode("temporary-cover");
                          setOverrideNote("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3">
        <div>
          <p className="section-label">Recent</p>
          <h2 className="section-title mt-2">Completion</h2>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2">
          {recentLogs.map((log) => {
            const member = familyMembers.find((item) => item.id === log.memberId);

            return (
              <div className="surface-soft p-3.5" key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slatewarm-900">{log.assignmentType}</p>
                    <p className="body-copy mt-1">{member?.displayName ?? "Family member"} • {formatCalendarLabel(log.completedAt)}</p>
                  </div>
                  <StatusPill label={log.status} tone={log.status === "completed" ? "success" : "critical"} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
