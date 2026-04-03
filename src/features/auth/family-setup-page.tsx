import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Panel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/state/app-state";

export function FamilySetupPage() {
  const navigate = useNavigate();
  const { createFamilyFromSetup, joinFamilyFromInvite, workspace } = useAppState();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState(workspace?.family?.inviteCode ?? "");
  const [error, setError] = useState("");

  function handleCreate() {
    setError("");
    const result = createFamilyFromSetup({ familyName });

    if (!result.success) {
      setError(result.error ?? "Unable to create the family workspace.");
      return;
    }

    navigate("/app/today");
  }

  function handleJoin() {
    setError("");
    const result = joinFamilyFromInvite(inviteCode);

    if (!result.success) {
      setError(result.error ?? "Unable to join this family.");
      return;
    }

    navigate("/app/today");
  }

  return (
    <div className="min-h-screen bg-glow px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_0.85fr]">
        <Panel className="space-y-6 px-6 py-8 md:px-8">
          <Badge tone="warm">Family setup</Badge>
          <div className="space-y-2.5">
            <h1 className="text-balance font-display text-4xl font-semibold leading-[0.99] tracking-[-0.03em] text-slatewarm-900">
              Create the family workspace or join with an invite.
            </h1>
            <p className="text-base leading-7 text-slatewarm-700">
              Version one is intentionally centered on one family workspace at a time. Once you complete this step, the whole app
              becomes personal: schedules rotate, members appear, and reminders are scoped to the home.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-2.5">
              <p className="text-base font-semibold text-slatewarm-900">Create a new family</p>
              <p className="body-copy">
                Ideal for a fresh workspace. Famtastic will seed a clean starter rhythm you can refine from the admin area.
              </p>
            </Card>
            <Card className="space-y-2.5">
              <p className="text-base font-semibold text-slatewarm-900">Join an existing family</p>
              <p className="body-copy">
                Use the invite code from a parent or admin so this account connects to the shared family workspace.
              </p>
            </Card>
          </div>
        </Panel>

        <Card className="space-y-5 px-6 py-7 md:px-7">
          <div className="segmented-shell">
            <Button variant={mode === "create" ? "primary" : "secondary"} onClick={() => setMode("create")}>
              Create family
            </Button>
            <Button variant={mode === "join" ? "primary" : "secondary"} onClick={() => setMode("join")}>
              Join family
            </Button>
          </div>

          {mode === "create" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="field-label">Family name</label>
                <Input placeholder="The Okello Family" value={familyName} onChange={(event) => setFamilyName(event.target.value)} />
              </div>
              <Button className="w-full" onClick={handleCreate}>
                Create family workspace
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="field-label">Invite code</label>
                <Input placeholder="OKEL-2684" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
              </div>
              <Button className="w-full" onClick={handleJoin}>
                Join this family
              </Button>
              {workspace?.family?.inviteCode ? (
                <p className="surface-soft px-4 py-3 text-sm leading-6 text-slatewarm-700">
                  Demo family invite code: <span className="font-semibold text-slatewarm-900">{workspace.family.inviteCode}</span>
                </p>
              ) : null}
            </div>
          )}

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{error}</p> : null}
        </Card>
      </div>
    </div>
  );
}
