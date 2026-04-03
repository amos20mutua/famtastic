import { ArrowRight, BellRing, HeartHandshake, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, Panel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/state/app-state";

const highlights = [
  {
    title: "A warm daily rhythm",
    description: "See devotions, duties, cooking, and reminders in one calm heartbeat view.",
    icon: HeartHandshake
  },
  {
    title: "Visible accountability",
    description: "Responsibilities stay present until they are actually finished, with gentle but clear escalation.",
    icon: BellRing
  },
  {
    title: "Reliable even offline",
    description: "Core schedules stay available and queued changes sync safely when your connection comes back.",
    icon: Wifi
  }
];

export function WelcomePage() {
  const navigate = useNavigate();
  const { continueWithDemo } = useAppState();

  return (
    <div className="min-h-screen bg-glow px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col gap-5 md:justify-center lg:flex-row">
        <Panel className="px-6 py-8 md:px-9 md:py-10 lg:flex-1">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge tone="warm" className="px-3 py-1.5">
                Warm, clear coordination for everyday family life
              </Badge>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-balance font-display text-4xl font-semibold leading-[0.98] tracking-[-0.03em] text-slatewarm-900 md:text-[3.9rem]">
                  A calm, dependable home operating system for the people doing life together.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slatewarm-700 md:text-[17px]">
                  Famtastic keeps meals, devotions, chores, shopping, and reminders beautifully organized so every family member
                  knows what matters today without the home feeling noisy or managed by a spreadsheet.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {highlights.map(({ title, description, icon: Icon }) => (
                <Card className="space-y-3" key={title}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slatewarm-100 bg-white text-pine-800 shadow-[0_10px_22px_-20px_rgba(27,45,36,0.22)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-base font-semibold text-slatewarm-900">{title}</h2>
                    <p className="body-copy">{description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Panel>

        <Card className="flex w-full flex-col justify-between gap-6 px-6 py-7 md:px-7 lg:max-w-[398px]">
          <div className="space-y-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slatewarm-100 bg-white text-base font-semibold text-pine-900 shadow-[0_12px_24px_-22px_rgba(27,45,36,0.22)]">
              F
            </div>
            <div className="space-y-2.5">
              <p className="section-label">Start here</p>
              <h2 className="font-display text-[2.1rem] font-semibold leading-[1.04] tracking-[-0.03em] text-slatewarm-900">Build the family rhythm.</h2>
              <p className="body-copy">
                Sign in to the demo family instantly or begin with email and create your own family workspace.
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
              Sign in or create an account
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
