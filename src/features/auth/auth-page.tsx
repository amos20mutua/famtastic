import { useState } from "react";
import { HeartHandshake, LockKeyhole, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/shared/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Panel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/state/app-state";

interface SignInState {
  email: string;
  password: string;
}

interface SignUpState extends SignInState {
  name: string;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signInState, setSignInState] = useState<SignInState>({
    email: "grace@famtastic.app",
    password: "demo1234"
  });
  const [signUpState, setSignUpState] = useState<SignUpState>({
    name: "",
    email: "",
    password: "welcome123"
  });
  const { signIn, signUp, continueWithDemo, workspace } = useAppState();
  const demoMembers = workspace?.members.filter((member) => member.familyId === workspace.family?.id) ?? [];
  const fastestDemoMember = demoMembers.find((member) => member.id === "member-grace") ?? demoMembers[0] ?? null;
  const alternateDemoMembers = demoMembers.filter((member) => member.id !== fastestDemoMember?.id);

  function validateSignIn(values: SignInState) {
    if (!isValidEmail(values.email.trim())) {
      return "Please enter a valid email address.";
    }

    if (values.password.trim().length < 4) {
      return "Please enter a valid password.";
    }

    return "";
  }

  function validateSignUp(values: SignUpState) {
    if (values.name.trim().length < 2) {
      return "Please add your name so the family recognizes this account.";
    }

    return validateSignIn(values);
  }

  async function handleSignInSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateSignIn(signInState);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    const result = await signIn({
      email: signInState.email.trim(),
      password: signInState.password
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Unable to sign in right now.");
      return;
    }

    navigate(result.needsFamily ? "/family/setup" : "/app/today");
  }

  async function handleSignUpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateSignUp(signUpState);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    const result = await signUp({
      name: signUpState.name.trim(),
      email: signUpState.email.trim(),
      password: signUpState.password
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Unable to create this account right now.");
      return;
    }

    navigate(result.needsFamily ? "/family/setup" : "/app/today");
  }

  return (
    <div className="min-h-screen bg-glow px-4 py-3.5 sm:py-6 md:px-6 md:py-8">
      <div className="mx-auto grid max-w-5xl gap-3 sm:gap-4 xl:max-w-6xl xl:grid-cols-[1.08fr_0.92fr] xl:gap-5">
        <Panel className="space-y-4 px-4 py-5 sm:px-5 sm:py-6 md:px-7 md:py-8">
          <div className="space-y-3">
            <Badge tone="warm">Fast entry</Badge>
            <div className="space-y-2.5">
              <h1 className="text-balance font-display text-[2rem] font-semibold leading-[0.95] tracking-[-0.038em] text-slatewarm-900 sm:text-[2.7rem] md:text-[3.2rem]">
                Sign in and move straight into the family day.
              </h1>
              <p className="max-w-2xl text-[14px] leading-[1.65] text-slatewarm-700 sm:text-[15px] sm:leading-[1.72]">
                Use the live demo immediately or create an account, then finish family setup and land in Today without extra detours.
              </p>
            </div>
          </div>

          <Card className="space-y-3">
            <div className="segmented-shell">
              <Button disabled={isSubmitting} variant={mode === "sign-in" ? "primary" : "secondary"} onClick={() => setMode("sign-in")}>
                Sign in
              </Button>
              <Button disabled={isSubmitting} variant={mode === "sign-up" ? "primary" : "secondary"} onClick={() => setMode("sign-up")}>
                Create account
              </Button>
            </div>

            {mode === "sign-in" ? (
              <form className="space-y-3" onSubmit={handleSignInSubmit}>
                <div className="space-y-2">
                  <label className="field-label" htmlFor="sign-in-email">
                    Email
                  </label>
                  <Input
                    autoComplete="email"
                    id="sign-in-email"
                    inputMode="email"
                    placeholder="grace@famtastic.app"
                    value={signInState.email}
                    onChange={(event) => setSignInState((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="field-label" htmlFor="sign-in-password">
                    Password
                  </label>
                  <Input
                    autoComplete="current-password"
                    id="sign-in-password"
                    placeholder="Any password in demo mode"
                    type="password"
                    value={signInState.password}
                    onChange={(event) => setSignInState((current) => ({ ...current, password: event.target.value }))}
                  />
                </div>
                <Button className="w-full" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            ) : (
              <form className="space-y-3" onSubmit={handleSignUpSubmit}>
                <div className="space-y-2">
                  <label className="field-label" htmlFor="sign-up-name">
                    Full name
                  </label>
                  <Input
                    autoComplete="name"
                    id="sign-up-name"
                    placeholder="Grace Okello"
                    value={signUpState.name}
                    onChange={(event) => setSignUpState((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="field-label" htmlFor="sign-up-email">
                    Email
                  </label>
                  <Input
                    autoComplete="email"
                    id="sign-up-email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={signUpState.email}
                    onChange={(event) => setSignUpState((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="field-label" htmlFor="sign-up-password">
                    Password
                  </label>
                  <Input
                    autoComplete="new-password"
                    id="sign-up-password"
                    placeholder="Choose a secure password"
                    type="password"
                    value={signUpState.password}
                    onChange={(event) => setSignUpState((current) => ({ ...current, password: event.target.value }))}
                  />
                </div>
                <Button className="w-full" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </form>
            )}

            {error ? <p className="rounded-2xl border border-danger-100 bg-danger-soft px-4 py-3 text-sm leading-6 text-danger-700">{error}</p> : null}
          </Card>
        </Panel>

        <Card className="space-y-4 px-4 py-[1.125rem] sm:px-5 sm:py-6 md:px-6">
          <div className="space-y-2.5">
            <Badge tone="muted">Fastest route</Badge>
            <h2 className="font-display text-[1.66rem] font-semibold leading-[0.98] tracking-[-0.034em] text-slatewarm-900 sm:text-[2.18rem]">
              Open the demo without filling a form.
            </h2>
            <p className="body-copy">
              Start with one seeded member instantly, or switch to another family role if you want to test different permissions.
            </p>
          </div>

          {fastestDemoMember ? (
            <Button
              className="w-full justify-between"
              onClick={() => {
                continueWithDemo(fastestDemoMember.id);
                navigate("/app/today");
              }}
            >
              Continue as {fastestDemoMember.displayName}
            </Button>
          ) : null}

          {alternateDemoMembers.length > 0 ? (
            <div className="space-y-2.5">
              <p className="section-label">Try another role</p>
              {alternateDemoMembers.map((member) => (
                <button
                  className="surface-tile flex w-full flex-col items-start gap-2.5 px-3 py-3 text-left transition hover:border-pine-200 hover:bg-canvas-surface md:flex-row md:items-center md:justify-between md:px-4 md:py-3.5"
                  key={member.id}
                  onClick={() => {
                    continueWithDemo(member.id);
                    navigate("/app/today");
                  }}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <Avatar member={member} />
                    <div>
                      <p className="font-semibold text-slatewarm-900">{member.displayName}</p>
                      <p className="meta-copy">
                        {member.role === "parent" ? "Parent / admin" : member.role === "co-admin" ? "Co-admin" : "Family member"}
                      </p>
                    </div>
                  </div>
                  <Badge tone="default">Enter</Badge>
                </button>
              ))}
            </div>
          ) : null}

          <div className="surface-soft grid gap-2 p-3 text-sm text-slatewarm-700 sm:p-3.5">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-brand" />
              Demo emails are already prefilled.
            </div>
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-4 w-4 text-brand" />
              In local demo mode, any password works.
            </div>
            <div className="flex items-center gap-3">
              <HeartHandshake className="h-4 w-4 text-brand" />
              Sign up if you want to test create or join family.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
