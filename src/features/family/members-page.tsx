import { useState } from "react";
import { Avatar } from "@/components/shared/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAppState } from "@/state/app-state";

export function MembersPage() {
  const { workspace, familyMembers, updateMemberNotifications, updateMemberRole, addFamilyMember, isAdmin, canManageMembers, currentUser } =
    useAppState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"parent" | "co-admin" | "member">("member");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Family"
        title="Profiles, roles, and communication preferences."
        description="Everyone can see the same household rhythm, while governance stays structured. Members can manage their own notification preferences without directly changing family controls."
        actions={<Badge tone="default">Invite code: {workspace?.family?.inviteCode}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div>
            <p className="section-label">Members</p>
            <h2 className="section-title mt-2">Inside this family workspace</h2>
          </div>

          <div className="grid gap-4">
            {familyMembers.map((member) => (
              <div className="surface-tile p-4" key={member.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar member={member} size="lg" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-slatewarm-900">{member.displayName}</p>
                        <Badge tone={member.role === "parent" ? "default" : member.role === "co-admin" ? "warm" : "muted"}>
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-slatewarm-600">{member.email}</p>
                    </div>
                  </div>

                  {canManageMembers ? (
                    <Select className="max-w-[180px]" value={member.role} onChange={(event) => updateMemberRole(member.id, event.target.value as typeof member.role)}>
                      <option value="parent">Parent / admin</option>
                      <option value="co-admin">Co-admin</option>
                      <option value="member">Family member</option>
                    </Select>
                  ) : (
                    <Badge tone="muted">Shared visibility, limited governance</Badge>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <button
                    className="surface-soft flex items-center justify-between px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={currentUser?.id !== member.id && !isAdmin}
                    onClick={() =>
                      updateMemberNotifications(member.id, {
                        browser: !member.notificationPreferences.browser
                      })
                    }
                    type="button"
                  >
                    <span className="field-label">Browser reminders</span>
                    <Badge tone={member.notificationPreferences.browser ? "success" : "muted"}>
                      {member.notificationPreferences.browser ? "On" : "Off"}
                    </Badge>
                  </button>
                  <button
                    className="surface-soft flex items-center justify-between px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={currentUser?.id !== member.id && !isAdmin}
                    onClick={() =>
                      updateMemberNotifications(member.id, {
                        stickyCards: !member.notificationPreferences.stickyCards
                      })
                    }
                    type="button"
                  >
                    <span className="field-label">Sticky reminders</span>
                    <Badge tone={member.notificationPreferences.stickyCards ? "success" : "muted"}>
                      {member.notificationPreferences.stickyCards ? "On" : "Off"}
                    </Badge>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="section-label">Invite / add</p>
            <h2 className="section-title mt-2">Grow the family workspace</h2>
          </div>

          <div className="space-y-3">
            <Input placeholder="Full name" value={name} onChange={(event) => setName(event.target.value)} />
            <Input placeholder="email@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            {canManageMembers ? (
              <>
                <Select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
                  <option value="member">Family member</option>
                  <option value="co-admin">Co-admin</option>
                  <option value="parent">Parent / admin</option>
                </Select>
                <Button
                  className="w-full"
                  onClick={() => {
                    addFamilyMember({ name, email, role });
                    setName("");
                    setEmail("");
                    setRole("member");
                  }}
                >
                  Add member to this family
                </Button>
              </>
            ) : (
              <div className="surface-soft rounded-3xl p-4 text-sm leading-6 text-slatewarm-700">
                New family members are added by a parent so roles stay clear and the workspace remains orderly.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
