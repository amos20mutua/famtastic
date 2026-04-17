import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarHeart,
  CookingPot,
  Download,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShoppingBasket,
  UsersRound
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Avatar } from "@/components/shared/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useAppState } from "@/state/app-state";

const primaryNavigation = [
  { to: "/app/today", label: "Today", icon: LayoutDashboard },
  { to: "/app/duties", label: "Duties", icon: HeartHandshake },
  { to: "/app/devotions", label: "Devotions", icon: CalendarHeart },
  { to: "/app/meals", label: "Meals", icon: CookingPot },
  { to: "/app/shopping", label: "Shopping", icon: ShoppingBasket },
  { to: "/app/notifications", label: "Reminders", icon: Bell }
];

const secondaryNavigation = [
  { to: "/app/family", label: "Family", icon: UsersRound },
  { to: "/app/admin", label: "Governance", icon: Settings2 }
];

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export function AppShell() {
  const { currentUser, familyMembers, unreadReminders, logout, workspace, syncState, isOnline, installReady, promptInstall } =
    useAppState();
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [isAppleTouchInstallable, setIsAppleTouchInstallable] = useState(false);
  const [showIosInstallHelp, setShowIosInstallHelp] = useState(false);
  const installHelpTimerRef = useRef<number | null>(null);
  const governanceLabel = currentUser?.role === "member" ? "Requests" : "Governance";
  const desktopNavigation = [...primaryNavigation, { ...secondaryNavigation[0] }, { ...secondaryNavigation[1], label: governanceLabel }];
  const canShowInstallButton = !isStandaloneMode && (installReady || isAppleTouchInstallable);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const browserNavigator = window.navigator as NavigatorWithStandalone;
    const isAppleTouchDevice =
      /iPad|iPhone|iPod/i.test(browserNavigator.userAgent) ||
      (browserNavigator.platform === "MacIntel" && browserNavigator.maxTouchPoints > 1);
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const refreshInstallability = () => {
      const standalone = displayModeQuery.matches || browserNavigator.standalone === true;
      setIsStandaloneMode(standalone);
      setIsAppleTouchInstallable(isAppleTouchDevice && !standalone);

      if (standalone) {
        setShowIosInstallHelp(false);
      }
    };

    refreshInstallability();
    window.addEventListener("appinstalled", refreshInstallability);

    if (typeof displayModeQuery.addEventListener === "function") {
      displayModeQuery.addEventListener("change", refreshInstallability);
    } else {
      displayModeQuery.addListener(refreshInstallability);
    }

    return () => {
      window.removeEventListener("appinstalled", refreshInstallability);

      if (typeof displayModeQuery.removeEventListener === "function") {
        displayModeQuery.removeEventListener("change", refreshInstallability);
      } else {
        displayModeQuery.removeListener(refreshInstallability);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (installHelpTimerRef.current !== null) {
        window.clearTimeout(installHelpTimerRef.current);
      }
    };
  }, []);

  async function handleInstallClick() {
    if (installReady) {
      setShowIosInstallHelp(false);
      await promptInstall();
      return;
    }

    if (!isAppleTouchInstallable) {
      return;
    }

    setShowIosInstallHelp(true);

    if (installHelpTimerRef.current !== null) {
      window.clearTimeout(installHelpTimerRef.current);
    }

    installHelpTimerRef.current = window.setTimeout(() => {
      setShowIosInstallHelp(false);
      installHelpTimerRef.current = null;
    }, 7000);
  }

  return (
    <div className="min-h-screen bg-canvas-primary bg-glow">
      <div className="mx-auto flex min-h-screen max-w-[1200px] gap-2.5 px-2 pb-24 pt-2 sm:px-3 sm:pt-3 md:px-4 md:pb-28 xl:gap-4 xl:pb-10">
        <aside className="hidden w-[240px] shrink-0 flex-col rounded-[1.75rem] border border-slatewarm-100 bg-canvas-surface/88 p-4 shadow-soft xl:flex">
          <div className="space-y-6">
              <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-slatewarm-100 bg-canvas-surface px-3.5 py-2.5 shadow-[0_8px_18px_-16px_rgba(26,34,29,0.08)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pine-800 text-base font-semibold text-white">
                  F
                </div>
                <div>
                  <p className="font-display text-xl text-slatewarm-900">Famtastic</p>
                  <p className="text-xs text-slatewarm-600">Calm family coordination</p>
                </div>
              </div>

              <div className="surface-soft p-4">
                <p className="section-label">Workspace</p>
                <h2 className="mt-2 font-display text-[1.68rem] leading-[1.02] tracking-[-0.03em] text-slatewarm-900">
                  {workspace?.family?.name}
                </h2>
                <p className="body-copy mt-2">{workspace?.family?.motto}</p>
              </div>
            </div>

            <nav className="space-y-1.5">
              {desktopNavigation.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-medium text-slatewarm-600 transition",
                      isActive
                        ? "bg-brand-soft text-slatewarm-900 shadow-[inset_0_0_0_1px_rgba(31,61,43,0.08),0_12px_24px_-20px_rgba(31,61,43,0.1)]"
                        : "hover:bg-canvas-surface/72 hover:text-slatewarm-800"
                    )
                  }
                  to={to}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  {to === "/app/notifications" && unreadReminders.length > 0 ? (
                    <Badge tone="critical">{unreadReminders.length}</Badge>
                  ) : null}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="surface-soft mt-auto space-y-4 rounded-[1.75rem] p-4">
            <div className="space-y-3">
              <p className="section-label">Household</p>
              <div className="flex -space-x-2.5">
                {familyMembers.map((member) => (
                  <div className="rounded-full border-[3px] border-sand-50" key={member.id}>
                    <Avatar member={member} size="sm" />
                  </div>
                ))}
              </div>
            </div>
            <Button fullWidth variant="secondary" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 rounded-[1.05rem] border border-slatewarm-100 bg-canvas-surface/92 px-3 py-2.5 shadow-soft backdrop-blur-sm sm:rounded-[1.4rem] sm:px-3.5 sm:py-3 md:px-4">
            <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[1rem] bg-pine-800 text-sm font-semibold text-white xl:hidden">
                    F
                  </div>
                  <div className="min-w-0">
                    <p className="section-label">Family heartbeat</p>
                    <p className="truncate font-display text-[1.12rem] font-medium leading-[1.02] tracking-[-0.025em] text-slatewarm-900 sm:text-[1.42rem]">
                      {workspace?.family?.name}
                    </p>
                  </div>
                </div>
                <p className="body-copy hidden max-w-lg lg:block">
                  Today stays clear, reminders stay visible, and the family rhythm remains easy to scan on the go.
                </p>
              </div>

              <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-2 md:w-auto md:justify-end">
                <Badge tone={isOnline ? "success" : "critical"}>{isOnline ? syncState : "Offline"}</Badge>
                {canShowInstallButton ? (
                  <div className="relative">
                    <Button
                      className="min-h-[34px] rounded-full border-pine-100 bg-brand-soft/80 px-3 text-[11px] text-brand-strong shadow-[0_12px_24px_-20px_rgba(31,61,43,0.28)] hover:bg-brand-soft sm:min-h-[36px] sm:text-[12px]"
                      variant="secondary"
                      onClick={() => void handleInstallClick()}
                    >
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Install
                    </Button>
                    {showIosInstallHelp ? (
                      <p className="absolute right-0 top-[calc(100%+0.45rem)] w-[min(16rem,70vw)] rounded-xl border border-slatewarm-200 bg-canvas-surface/98 px-3 py-2 text-[11px] leading-4 text-slatewarm-700 shadow-[0_18px_34px_-28px_rgba(26,34,29,0.32)] sm:text-[12px]">
                        iPhone and iPad: tap Share, then Add to Home Screen.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {unreadReminders.length > 0 ? <Badge tone="critical">{unreadReminders.length} pending</Badge> : null}
                {currentUser ? <Avatar member={currentUser} size="sm" /> : null}
                <Button className="px-3 xl:hidden" variant="ghost" onClick={() => void logout()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2 xl:hidden">
              {secondaryNavigation.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition sm:gap-2 sm:px-3 sm:py-2 sm:text-sm",
                      isActive
                        ? "border-pine-100 bg-brand-soft text-slatewarm-900 shadow-[inset_0_0_0_1px_rgba(31,61,43,0.08),0_10px_20px_-18px_rgba(31,61,43,0.08)]"
                        : "border-slatewarm-200 bg-canvas-surface text-slatewarm-600"
                    )
                  }
                  to={to}
                >
                  <Icon className="h-4 w-4" />
                  {to === "/app/admin" ? governanceLabel : label}
                </NavLink>
              ))}
            </div>
          </header>

          <main className="flex-1 scroll-pb-24 px-0 py-2.5 sm:py-4 md:py-5 xl:py-6">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slatewarm-100 bg-canvas-surface/96 px-1.5 pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-1.5 shadow-[0_-14px_28px_-30px_rgba(26,34,29,0.14)] backdrop-blur-sm sm:px-2 sm:pt-2 xl:hidden">
        <div className="mx-auto grid max-w-[720px] grid-cols-6 gap-1 sm:gap-1.5">
          {primaryNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              className={({ isActive }) =>
                cn(
                  "relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-[0.9rem] px-1 text-[10px] font-medium text-slatewarm-600 transition sm:min-h-[54px] sm:gap-1 sm:rounded-[1.1rem] sm:text-[11px]",
                  isActive
                    ? "bg-brand-soft text-slatewarm-900 shadow-[inset_0_0_0_1px_rgba(31,61,43,0.08),0_10px_20px_-18px_rgba(31,61,43,0.08)]"
                    : "hover:bg-canvas-surface/75"
                )
              }
              to={to}
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={cn("h-4 w-4", isActive ? "text-brand" : "text-slatewarm-600")} />
                    {to === "/app/notifications" && unreadReminders.length > 0 ? (
                      <span className="absolute -right-2 -top-2 inline-flex min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                        {unreadReminders.length > 9 ? "9+" : unreadReminders.length}
                      </span>
                    ) : null}
                  </div>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
