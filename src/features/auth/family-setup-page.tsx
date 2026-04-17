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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    setError("");
    setIsSubmitting(true);
    const result = await createFamilyFromSetup({ familyName });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Unable to create the family workspace.");
      return;
    }

    navigate("/app/today");
  }

  async function handleJoin() {
    setError("");
    setIsSubmitting(true);
    const result = await joinFamilyFromInvite(inviteCode);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Unable to join this family.");
      return;
    }

    navigate("/app/today");
  }

  return (
    <div className="min-h-screen bg-glow px-4 py-3.5 sm:py-6 md:px-6 md:py-8">
      <div className="mx-auto grid max-w-4xl gap-3 sm:gap-4 xl:max-w-5xl xl:grid-cols-[1fr_0.85fr] xl:gap-5">
        <Panel className="space-y-4 px-4 py-5 sm:px-5 sm:py-6 md:px-7">
          <Badge tone="warm">Step 3 of 3</Badge>
          <div className="space-y-2.5">
            <h1 className="text-balance font-display text-[1.92rem] font-semibold leading-[0.95] tracking-[-0.038em] text-slatewarm-900 sm:text-[2.6rem]">
              Finish setup and open the shared family workspace.
            </h1>
            <p className="text-[14px] leading-[1.65] text-slatewarm-700 sm:text-[15px] sm:leading-[1.72]">
              Choose one path, complete it, and the app takes you straight to Today.
            </p>
          </div>

          <Card className="space-y-3">
            <p className="section-label">Quick path</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="surface-soft px-3 py-3">
                <p className="field-label">1. Choose</p>
                <p className="body-copy mt-1">Create a new family or join an existing one.</p>
              </div>
              <div className="surface-soft px-3 py-3">
                <p className="field-label">2. Confirm</p>
                <p className="body-copy mt-1">Add a family name or paste the invite code.</p>
              </div>
              <div className="surface-soft px-3 py-3">
                <p className="field-label">3. Start today</p>
                <p className="body-copy mt-1">Famtastic opens the family command hub immediately.</p>
              </div>
            </div>
          </Card>
        </Panel>

        <Card className="space-y-4 px-4 py-[1.125rem] sm:px-5 sm:py-6 md:px-6">
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
                <p className="meta-copy">Use the name your household already uses in real life.</p>
              </div>
              <Button className="w-full" disabled={!familyName.trim() || isSubmitting} onClick={() => void handleCreate()}>
                Create family workspace
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="field-label">Invite code</label>
                <Input
                  placeholder="OKEL-2684"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase().trimStart())}
                />
                <p className="meta-copy">Paste the invite code from a parent or admin.</p>
              </div>
              <Button className="w-full" disabled={!inviteCode.trim() || isSubmitting} onClick={() => void handleJoin()}>
                Join this family
              </Button>
              {workspace?.family?.inviteCode ? (
                <p className="surface-soft px-4 py-3 text-sm leading-6 text-slatewarm-700">
                  Demo family invite code: <span className="font-semibold text-slatewarm-900">{workspace.family.inviteCode}</span>
                </p>
              ) : null}
            </div>
          )}

          {error ? <p className="rounded-2xl border border-danger-100 bg-danger-soft px-4 py-3 text-sm leading-6 text-danger-700">{error}</p> : null}
        </Card>
      </div>
    </div>
  );
}
