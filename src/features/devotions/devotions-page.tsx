import { useEffect, useState } from "react";
import { Avatar } from "@/components/shared/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFocusTarget } from "@/hooks/use-focus-target";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCalendarLabel } from "@/lib/date";
import { useAppState } from "@/state/app-state";

export function DevotionsPage() {
  const { familyMembers, workspace, todayDevotion, nextDevotion, updateDevotion, canManageSchedules, submitChangeRequest } =
    useAppState();
  const { isFocused } = useFocusTarget();
  const [form, setForm] = useState({
    leaderId: "",
    bibleReading: "",
    topic: "",
    notes: ""
  });
  const [requestedLeaderId, setRequestedLeaderId] = useState("");
  const [requestReason, setRequestReason] = useState("");

  useEffect(() => {
    if (!todayDevotion) {
      return;
    }

    setForm({
      leaderId: todayDevotion.leaderId,
      bibleReading: todayDevotion.bibleReading,
      topic: todayDevotion.topic,
      notes: todayDevotion.notes
    });
    setRequestedLeaderId(todayDevotion.leaderId);
  }, [todayDevotion]);

  const devotionSchedule =
    workspace?.devotionAssignments
      .slice()
      .filter((devotion) => new Date(devotion.date) >= new Date(new Date().toDateString()))
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(0, 6) ?? [];

  const nextLeader = familyMembers.find((member) => member.id === nextDevotion?.leaderId) ?? null;

  return (
    <div className="space-y-3 sm:space-y-5">
      <PageHeader
        eyebrow="Devotions"
        title="A family spiritual rhythm that feels dignified and visible."
        description="Leadership rotates, the next devotion is always clear, and each evening can carry a reading, topic, and notes without becoming cluttered."
        actions={<Badge tone="default">{workspace?.settings.devotionTime ?? "20:00"} devotion rhythm</Badge>}
      />

      <div className="grid gap-3 sm:gap-5 lg:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div>
            <p className="section-label">Tonight</p>
            <h2 className="section-title mt-2">Today's devotion plan</h2>
          </div>

          {todayDevotion ? (
            <div className="space-y-4">
              <div
                className={`rounded-[1.1rem] p-3 outline-none sm:rounded-[1.5rem] sm:p-4 ${
                  isFocused(todayDevotion.id) ? "surface-active" : "surface-soft"
                }`}
                data-focus-id={todayDevotion.id}
                tabIndex={-1}
              >
                <div className="flex items-start gap-3">
                  {nextLeader ? (
                    <Avatar member={familyMembers.find((member) => member.id === todayDevotion.leaderId) ?? nextLeader} />
                  ) : null}
                  <div>
                    <p className="text-lg font-semibold text-slatewarm-900">
                      {familyMembers.find((member) => member.id === todayDevotion.leaderId)?.displayName ?? "Leader not selected"}
                    </p>
                    <p className="text-sm text-slatewarm-600">{todayDevotion.time}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <div>
                    <p className="section-label">Reading</p>
                    <p className="mt-1 text-base font-semibold text-slatewarm-900">{todayDevotion.bibleReading}</p>
                  </div>
                  <div>
                    <p className="section-label">Topic</p>
                    <p className="mt-1 text-base font-semibold text-slatewarm-900">{todayDevotion.topic}</p>
                  </div>
                  <p className="body-copy">{todayDevotion.notes}</p>
                </div>
              </div>

              {canManageSchedules ? (
                <div className="surface-tile space-y-3 p-3 sm:space-y-4 sm:p-4">
                  <div>
                    <p className="text-sm font-semibold text-slatewarm-900">Refine today's devotion</p>
                    <p className="mt-1 text-sm text-slatewarm-600">
                      Changes save instantly to the local workspace and are ready for Supabase sync later.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="field-label">Leader</label>
                    <Select value={form.leaderId} onChange={(event) => setForm((current) => ({ ...current, leaderId: event.target.value }))}>
                      {familyMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.displayName}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="field-label">Bible reading</label>
                    <Input value={form.bibleReading} onChange={(event) => setForm((current) => ({ ...current, bibleReading: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="field-label">Topic</label>
                    <Input value={form.topic} onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="field-label">Leader notes</label>
                    <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
                  </div>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() =>
                      updateDevotion(todayDevotion.id, {
                        leaderId: form.leaderId,
                        bibleReading: form.bibleReading,
                        topic: form.topic,
                        notes: form.notes
                      })
                    }
                  >
                    Save devotion plan
                  </Button>
                </div>
              ) : (
                <div className="surface-tile space-y-3 p-3 sm:space-y-4 sm:p-4">
                  <div>
                    <p className="text-sm font-semibold text-slatewarm-900">Request a devotion change</p>
                    <p className="mt-1 text-sm text-slatewarm-600">
                      Leadership order stays structured, but family members can still suggest a change respectfully.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="field-label">Suggested leader</label>
                    <Select value={requestedLeaderId} onChange={(event) => setRequestedLeaderId(event.target.value)}>
                      {familyMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.displayName}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="field-label">Reason</label>
                    <Textarea
                      value={requestReason}
                      onChange={(event) => setRequestReason(event.target.value)}
                      placeholder="Explain why the leader or plan should change."
                    />
                  </div>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => {
                      const result = submitChangeRequest({
                        type: "devotion-reassign",
                        targetType: "devotion",
                        targetId: todayDevotion.id,
                        title: `Devotion change request for ${todayDevotion.date}`,
                        details: requestReason || "Please review today's devotion leadership.",
                        requestedForMemberId: requestedLeaderId,
                        proposedChanges: {
                          leaderId: requestedLeaderId
                        }
                      });

                      if (result.success) {
                        setRequestReason("");
                      }
                    }}
                  >
                    Submit request
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <div>
            <p className="section-label">Schedule</p>
            <h2 className="section-title mt-2">Upcoming devotion leaders</h2>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {devotionSchedule.map((devotion) => {
              const member = familyMembers.find((familyMember) => familyMember.id === devotion.leaderId);

              return (
                <div
                  className={`rounded-[1.1rem] p-3 outline-none sm:rounded-3xl sm:p-4 ${
                    isFocused(devotion.id) ? "surface-active" : "surface-tile"
                  }`}
                  data-focus-id={devotion.id}
                  key={devotion.id}
                  tabIndex={-1}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      {member ? <Avatar member={member} size="sm" /> : null}
                      <div>
                        <p className="font-semibold text-slatewarm-900">{devotion.topic}</p>
                        <p className="text-sm text-slatewarm-600">{`${member?.displayName ?? "Leader"} - ${formatCalendarLabel(devotion.date)}`}</p>
                      </div>
                    </div>
                    <Badge tone="muted">{devotion.time}</Badge>
                  </div>
                  <p className="body-copy mt-3">{devotion.bibleReading}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
