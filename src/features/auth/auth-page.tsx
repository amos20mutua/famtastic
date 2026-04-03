import { useState } from "react";
import { HeartHandshake, LockKeyhole, Mail, UserRound } from "lucide-react";
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
    <div className="min-h-screen bg-glow px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <Panel className="space-y-7 px-6 py-8 md:px-8 md:py-9">
          <div className="space-y-3">
            <Badge tone="warm">One family first. Scaled thoughtfully later.</Badge>
            <div className="space-y-2.5">
              <h1 className="text-balance font-display text-4xl font-semibold leading-[0.99] tracking-[-0.03em] text-slatewarm-900 md:text-[3.4rem]">
                A secure front door into shared family life.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slatewarm-700">
                Use the live demo immediately or create a fresh family workspace. In demo mode, any password works for the seeded
                family accounts so you can test the full product flow without friction.
              </p>
            </div>
          </div>

          <Card className="space-y-4">
            <div className="segmented-shell">
              <Button disabled={isSubmitting} variant={mode === "sign-in" ? "primary" : "secondary"} onClick={() => setMode("sign-in")}>
                Sign in
              </Button>
              <Button disabled={isSubmitting} variant={mode === "sign-up" ? "primary" : "secondary"} onClick={() => setMode("sign-up")}>
                Create account
              </Button>
            </div>

            {mode === "sign-in" ? (
              <form className="space-y-4" onSubmit={handleSignInSubmit}>
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
              <form className="space-y-4" onSubmit={handleSignUpSubmit}>
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

            {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{error}</p> : null}
          </Card>
        </Panel>

        <Card className="space-y-5 px-6 py-7 md:px-7">
          <div className="space-y-2.5">
            <Badge tone="muted">Instant access</Badge>
            <h2 className="font-display text-[2.1rem] font-semibold leading-[1.04] tracking-[-0.03em] text-slatewarm-900">Step into the seeded family workspace.</h2>
            <p className="body-copy">
              Pick a family member below to land directly in the product with realistic schedules, reminders, meals, and completion
              history already running.
            </p>
          </div>

          <div className="space-y-3">
            {demoMembers.map((member) => (
              <button
                className="surface-tile flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:border-pine-200 hover:bg-white"
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

          <div className="surface-soft grid gap-3 p-4 text-sm text-slatewarm-700">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-pine-700" />
              Demo emails are already prefilled for quick exploration.
            </div>
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-4 w-4 text-pine-700" />
              In local demo mode, passwords are not enforced.
            </div>
            <div className="flex items-center gap-3">
              <UserRound className="h-4 w-4 text-pine-700" />
              Use sign up if you want to test the family create / join flow.
            </div>
            <div className="flex items-center gap-3">
              <HeartHandshake className="h-4 w-4 text-pine-700" />
              The full app experience opens immediately after authentication.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
