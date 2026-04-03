import { PageHeader } from "@/components/shared/page-header";
import { StatusPill } from "@/components/shared/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCalendarLabel, formatClock, formatRelativeWindow } from "@/lib/date";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/state/app-state";

function toneForReminder(state: "upcoming" | "due-soon" | "overdue") {
  if (state === "overdue") {
    return "critical" as const;
  }

  if (state === "due-soon") {
    return "warm" as const;
  }

  return "default" as const;
}

function permissionValueClass(permission: NotificationPermission | "unsupported") {
  if (permission === "granted") {
    return "text-success-700";
  }

  if (permission === "denied") {
    return "text-danger-700";
  }

  if (permission === "default") {
    return "text-warning-700";
  }

  return "text-ink-secondary";
}

function deliveryValueClass(pushSubscriptionEnabled: boolean, canUsePushNotifications: boolean) {
  if (pushSubscriptionEnabled) {
    return "text-success-700";
  }

  if (canUsePushNotifications) {
    return "text-brand";
  }

  return "text-warning-700";
}

function serverPushValueClass(pushNotificationsConfigured: boolean, pushSubscriptionEnabled: boolean) {
  if (pushNotificationsConfigured && pushSubscriptionEnabled) {
    return "text-success-700";
  }

  if (pushNotificationsConfigured) {
    return "text-warning-700";
  }

  return "text-ink-secondary";
}

function targetForReminder(kind: "duty" | "devotion" | "meal", relatedId: string) {
  if (kind === "duty") {
    return `/app/duties?focus=${relatedId}`;
  }

  if (kind === "meal") {
    return `/app/meals?focus=${relatedId}`;
  }

  return `/app/devotions?focus=${relatedId}`;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const {
    reminders,
    unreadReminders,
    markReminderRead,
    markAllRemindersRead,
    workspace,
    requestBrowserNotifications,
    sendTestNotification,
    notificationPermission,
    canUsePushNotifications,
    pushNotificationsConfigured,
    pushSubscriptionEnabled,
    currentUser
  } = useAppState();
  const deviceReminders = reminders.filter((reminder) => reminder.assigneeId === currentUser?.id);

  return (
    <div className="space-y-3 sm:space-y-5">
      <PageHeader
        eyebrow="Reminder center"
        title="Highly visible reminders without turning the home noisy."
        description="Upcoming, due-soon, and overdue states stay clear here. The same urgency is reflected across badges, sticky cards, and optional browser notifications."
        actions={
          <>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void sendTestNotification()}>
              Send test reminder
            </Button>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void requestBrowserNotifications()}>
              Enable browser notifications
            </Button>
            <Button className="w-full sm:w-auto" variant="soft" onClick={markAllRemindersRead}>
              Mark all read
            </Button>
          </>
        }
      />

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone="critical">{deviceReminders.filter((reminder) => reminder.state === "overdue").length} overdue</Badge>
          <Badge tone="warm">{deviceReminders.filter((reminder) => reminder.state === "due-soon").length} due soon</Badge>
          <Badge tone="default">{unreadReminders.length} unread</Badge>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            <div className="surface-soft p-3 sm:p-3.5">
            <p className="section-label">Permission</p>
            <p className={`mt-2 text-lg font-semibold ${permissionValueClass(notificationPermission)}`}>
              {notificationPermission === "granted"
                ? "Allowed"
                : notificationPermission === "denied"
                  ? "Blocked"
                  : notificationPermission === "default"
                    ? "Not enabled"
                    : "Unsupported"}
            </p>
            <p className="body-copy mt-2">
              Chrome on Android works best when Famtastic is installed to the home screen.
            </p>
          </div>
            <div className="surface-soft p-3 sm:p-3.5">
            <p className="section-label">Device delivery</p>
            <p className={`mt-2 text-lg font-semibold ${deliveryValueClass(pushSubscriptionEnabled, canUsePushNotifications)}`}>
              {pushSubscriptionEnabled ? "Push connected" : canUsePushNotifications ? "Local reminders ready" : "Limited support"}
            </p>
            <p className="body-copy mt-2">
              Assigned duties are stored on this device so installed-PWA reminders can still be evaluated with weak connectivity.
            </p>
          </div>
            <div className="surface-soft p-3 sm:p-3.5">
            <p className="section-label">Server push</p>
            <p className={`mt-2 text-lg font-semibold ${serverPushValueClass(pushNotificationsConfigured, pushSubscriptionEnabled)}`}>
              {pushNotificationsConfigured ? (pushSubscriptionEnabled ? "Live" : "Ready to connect") : "Needs VAPID key"}
            </p>
            <p className="body-copy mt-2">
              When configured, online reminders can also be triggered from the server and open the exact task screen.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {reminders.map((reminder) => (
            <div className="surface-tile p-3 sm:p-3.5" key={reminder.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={reminder.state.replace("-", " ")} tone={toneForReminder(reminder.state)} />
                    <Badge tone="muted">{formatRelativeWindow(reminder.dueAt)}</Badge>
                    {!reminder.read ? <Badge tone="warm">Unread</Badge> : <Badge tone="muted">Read</Badge>}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slatewarm-900">{reminder.title}</h2>
                    <p className="body-copy mt-2 max-w-2xl">{reminder.body}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-slatewarm-600">
                    <span>{formatCalendarLabel(reminder.dueAt)}</span>
                    <span>{formatClock(reminder.dueAt)}</span>
                  </div>
                </div>
                {!reminder.read ? (
                  <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                    <Button
                      className="w-full sm:w-auto"
                      variant="secondary"
                      onClick={() => navigate(targetForReminder(reminder.kind, reminder.relatedId))}
                    >
                      Open
                    </Button>
                    <Button className="w-full sm:w-auto" variant="soft" onClick={() => markReminderRead(reminder.id)}>
                      Mark as seen
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    onClick={() => navigate(targetForReminder(reminder.kind, reminder.relatedId))}
                  >
                    Open
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div>
          <p className="section-label">System notices</p>
          <h2 className="section-title mt-2">Additional family updates</h2>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2">
          {workspace?.notifications.map((notification) => (
            <div className="surface-soft p-3 sm:p-3.5" key={notification.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slatewarm-900">{notification.title}</p>
                <Badge tone={notification.severity === "urgent" ? "critical" : notification.severity === "important" ? "warm" : "muted"}>
                  {notification.severity}
                </Badge>
              </div>
              <p className="body-copy mt-2">{notification.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
