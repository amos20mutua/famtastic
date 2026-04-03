import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAppState } from "@/state/app-state";

const AppShell = lazy(() => import("@/components/layout/app-shell").then((module) => ({ default: module.AppShell })));
const WelcomePage = lazy(() => import("@/features/auth/welcome-page").then((module) => ({ default: module.WelcomePage })));
const AuthPage = lazy(() => import("@/features/auth/auth-page").then((module) => ({ default: module.AuthPage })));
const FamilySetupPage = lazy(() =>
  import("@/features/auth/family-setup-page").then((module) => ({ default: module.FamilySetupPage }))
);
const TodayPage = lazy(() => import("@/features/dashboard/today-page").then((module) => ({ default: module.TodayPage })));
const DutiesPage = lazy(() => import("@/features/duties/duties-page").then((module) => ({ default: module.DutiesPage })));
const DevotionsPage = lazy(() =>
  import("@/features/devotions/devotions-page").then((module) => ({ default: module.DevotionsPage }))
);
const MealsPage = lazy(() => import("@/features/meals/meals-page").then((module) => ({ default: module.MealsPage })));
const ShoppingPage = lazy(() =>
  import("@/features/shopping/shopping-page").then((module) => ({ default: module.ShoppingPage }))
);
const NotificationsPage = lazy(() =>
  import("@/features/notifications/notifications-page").then((module) => ({ default: module.NotificationsPage }))
);
const MembersPage = lazy(() => import("@/features/family/members-page").then((module) => ({ default: module.MembersPage })));
const AdminSettingsPage = lazy(() =>
  import("@/features/admin/admin-settings-page").then((module) => ({ default: module.AdminSettingsPage }))
);

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-glow px-4">
      <Card className="w-full max-w-md space-y-3 px-6 py-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">Famtastic</p>
        <h1 className="font-display text-4xl text-slatewarm-900">Preparing the family rhythm...</h1>
        <p className="text-sm leading-6 text-slatewarm-600">Loading your schedules, reminders, shopping list, and offline-ready workspace.</p>
      </Card>
    </div>
  );
}

function resolveLandingPath({
  currentUserFamilyId,
  hasUser
}: {
  currentUserFamilyId: string | null | undefined;
  hasUser: boolean;
}) {
  if (!hasUser) {
    return "/welcome";
  }

  if (!currentUserFamilyId) {
    return "/family/setup";
  }

  return "/app/today";
}

function AppRootRedirect() {
  const { currentUser } = useAppState();

  return (
    <Navigate
      replace
      to={resolveLandingPath({
        currentUserFamilyId: currentUser?.familyId,
        hasUser: Boolean(currentUser)
      })}
    />
  );
}

function AppRouteGuard() {
  const { currentUser } = useAppState();

  if (!currentUser) {
    return <Navigate replace to="/login" />;
  }

  if (!currentUser.familyId) {
    return <Navigate replace to="/family/setup" />;
  }

  return <Outlet />;
}

function WelcomeRoute() {
  const { currentUser } = useAppState();

  if (currentUser?.familyId) {
    return <Navigate replace to="/app/today" />;
  }

  return <WelcomePage />;
}

function LoginRoute() {
  const { currentUser } = useAppState();

  if (currentUser?.familyId) {
    return <Navigate replace to="/app/today" />;
  }

  return <AuthPage />;
}

function FamilySetupRoute() {
  const { currentUser } = useAppState();

  if (!currentUser) {
    return <Navigate replace to="/login" />;
  }

  if (currentUser.familyId) {
    return <Navigate replace to="/app/today" />;
  }

  return <FamilySetupPage />;
}

function RoutedApp() {
  const { isHydrating } = useAppState();

  if (isHydrating) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<AppRootRedirect />} path="/" />
          <Route element={<WelcomeRoute />} path="/welcome" />
          <Route element={<LoginRoute />} path="/login" />
          <Route element={<FamilySetupRoute />} path="/family/setup" />
          <Route element={<AppRouteGuard />}>
            <Route element={<AppShell />} path="/app">
              <Route element={<Navigate replace to="/app/today" />} index />
              <Route element={<TodayPage />} path="today" />
              <Route element={<DutiesPage />} path="duties" />
              <Route element={<DevotionsPage />} path="devotions" />
              <Route element={<MealsPage />} path="meals" />
              <Route element={<ShoppingPage />} path="shopping" />
              <Route element={<NotificationsPage />} path="notifications" />
              <Route element={<MembersPage />} path="family" />
              <Route element={<AdminSettingsPage />} path="admin" />
            </Route>
          </Route>
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export function AppRouter() {
  return <RoutedApp />;
}
