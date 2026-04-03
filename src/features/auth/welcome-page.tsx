import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, Panel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/state/app-state";

const startSteps = [
  "Open the demo or sign in.",
  "Create or join one family workspace.",
  "Land in Today and act immediately."
];

export function WelcomePage() {
  const navigate = useNavigate();
  const { continueWithDemo } = useAppState();

  return (
    <div className="min-h-screen bg-glow px-4 py-3.5 sm:py-6 md:px-6 md:py-8">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-5xl flex-col gap-3 sm:gap-4 md:justify-center xl:max-w-6xl xl:flex-row xl:gap-5">
        <Panel className="px-4 py-5 sm:px-5 sm:py-6 md:px-7 md:py-8 xl:flex-1">
          <div className="space-y-5 sm:space-y-6">
            <div className="space-y-4">
              <Badge tone="warm" className="px-3 py-1.5">
                3-step start
              </Badge>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-balance font-display text-[2.04rem] font-semibold leading-[0.94] tracking-[-0.038em] text-slatewarm-900 sm:text-[2.8rem] md:text-[3.55rem]">
                  Open the family day and know exactly what to do next.
                </h1>
                <p className="max-w-2xl text-[14px] leading-[1.65] text-slatewarm-700 md:text-[16px] md:leading-[1.72]">
                  Famtastic keeps meals, devotions, duties, shopping, and reminders clear enough that the family can act without
                  pausing to figure out the system.
                </p>
              </div>
            </div>

            <Card className="space-y-3">
              <p className="section-label">What happens next</p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {startSteps.map((step, index) => (
                  <div className="surface-soft flex items-start gap-3 px-3 py-3" key={step}>
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand-strong">
                      {index + 1}
                    </span>
                    <p className="body-copy">{step}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Panel>

        <Card className="flex w-full flex-col justify-between gap-4 px-4 py-[1.125rem] sm:px-5 sm:py-6 md:px-6 xl:max-w-[392px]">
          <div className="space-y-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-divider bg-canvas-surface text-base font-semibold text-brand-strong shadow-[0_12px_24px_-22px_rgba(31,61,43,0.18)]">
              F
            </div>
            <div className="space-y-2.5">
              <p className="section-label">Start here</p>
              <h2 className="font-display text-[1.66rem] font-semibold leading-[0.98] tracking-[-0.034em] text-slatewarm-900 sm:text-[2.2rem]">
                Get into Today fast.
              </h2>
              <p className="body-copy">
                Use the demo in one tap or continue with email and finish setup in a few short steps.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full justify-between"
              onClick={() => {
                continueWithDemo("member-grace");
                navigate("/app/today");
              }}
            >
              Explore the live demo
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button className="w-full" variant="secondary" onClick={() => navigate("/login")}>
              Continue with email
            </Button>
            <p className="meta-copy leading-6">
              The demo opens with realistic duties, devotion plans, meals, reminders, and family members already in motion.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
