import {
  Bell,
  CalendarHeart,
  CookingPot,
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

export function AppShell() {
  const { currentUser, familyMembers, unreadReminders, logout, workspace, syncState, isOnline } = useAppState();
  const governanceLabel = currentUser?.role === "member" ? "Requests" : "Governance";
  const desktopNavigation = [...primaryNavigation, { ...secondaryNavigation[0] }, { ...secondaryNavigation[1], label: governanceLabel }];

  return (
    <div className="min-h-screen bg-sand-50 bg-glow">
      <div className="mx-auto flex min-h-screen max-w-[1340px] gap-5 px-4 pb-24 pt-4 md:px-5 md:pb-28 xl:pb-10">
        <aside className="hidden w-[252px] shrink-0 flex-col rounded-[2rem] border border-slatewarm-100 bg-white/88 p-5 shadow-soft xl:flex">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-slatewarm-100 bg-white px-3.5 py-2.5 shadow-[0_8px_18px_-16px_rgba(31,26,23,0.1)]">
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
                <h2 className="mt-2 font-display text-[1.6rem] leading-tight text-slatewarm-900">{workspace?.family?.name}</h2>
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
                        ? "bg-white text-slatewarm-900 shadow-[inset_0_0_0_1px_rgba(45,71,57,0.08),0_12px_24px_-20px_rgba(27,45,36,0.12)]"
                        : "hover:bg-white/72 hover:text-slatewarm-800"
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
          <header className="sticky top-0 z-30 rounded-[1.75rem] border border-slatewarm-100 bg-white/92 px-4 py-4 shadow-soft backdrop-blur-sm md:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pine-800 text-base font-semibold text-white xl:hidden">
                    F
                  </div>
                  <div className="min-w-0">
                    <p className="section-label">Family heartbeat</p>
                    <p className="truncate font-display text-[1.55rem] leading-tight text-slatewarm-900">
                      {workspace?.family?.name}
                    </p>
                  </div>
                </div>
                <p className="body-copy hidden max-w-xl md:block">
                  Today stays clear, reminders stay visible, and the family rhythm remains easy to scan on the go.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={isOnline ? "success" : "critical"}>{isOnline ? syncState : "Offline"}</Badge>
                {unreadReminders.length > 0 ? <Badge tone="critical">{unreadReminders.length} pending</Badge> : null}
                {currentUser ? <Avatar member={currentUser} size="sm" /> : null}
                <Button className="px-3 xl:hidden" variant="ghost" onClick={() => void logout()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 xl:hidden">
              {secondaryNavigation.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "border-pine-100 bg-white text-slatewarm-900 shadow-[inset_0_0_0_1px_rgba(45,71,57,0.08),0_10px_20px_-18px_rgba(27,45,36,0.1)]"
                        : "border-slatewarm-200 bg-white text-slatewarm-600"
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

          <main className="flex-1 px-0 py-5 md:py-6 xl:py-7">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slatewarm-100 bg-white/96 px-2 pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-2 shadow-[0_-14px_28px_-30px_rgba(31,26,23,0.18)] backdrop-blur-sm xl:hidden">
        <div className="mx-auto grid max-w-[720px] grid-cols-6 gap-1">
          {primaryNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              className={({ isActive }) =>
                cn(
                  "relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium text-slatewarm-600 transition",
                  isActive
                    ? "bg-white text-slatewarm-900 shadow-[inset_0_0_0_1px_rgba(45,71,57,0.08),0_10px_20px_-18px_rgba(27,45,36,0.1)]"
                    : "hover:bg-white/75"
                )
              }
              to={to}
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={cn("h-4 w-4", isActive ? "text-pine-800" : "text-slatewarm-600")} />
                    {to === "/app/notifications" && unreadReminders.length > 0 ? (
                      <span className="absolute -right-2 -top-2 inline-flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
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
