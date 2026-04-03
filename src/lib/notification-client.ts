import type {
  DeviceNotificationSchedule,
  PushSubscriptionRecord,
  ServiceWorkerMessage
} from "@/data/types";

interface SyncManagerLike {
  register(tag: string): Promise<void>;
}

interface PeriodicSyncManagerLike {
  register(tag: string, options: { minInterval: number }): Promise<void>;
}

interface ServiceWorkerRegistrationWithExtras extends ServiceWorkerRegistration {
  sync?: SyncManagerLike;
  periodicSync?: PeriodicSyncManagerLike;
}

async function resolveServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration().catch(() => null);

  if (existingRegistration) {
    return existingRegistration as ServiceWorkerRegistrationWithExtras;
  }

  return null;
}

function toUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

async function postToServiceWorker(message: ServiceWorkerMessage) {
  const registration = await resolveServiceWorkerRegistration();
  registration?.active?.postMessage(message);
}

export async function syncReminderScheduleToWorker(schedule: DeviceNotificationSchedule) {
  await postToServiceWorker({
    type: "FAMTASTIC_SYNC_REMINDERS",
    payload: schedule
  });
}

export async function clearReminderScheduleFromWorker() {
  await postToServiceWorker({
    type: "FAMTASTIC_CLEAR_SESSION"
  });
}

export async function evaluateRemindersInWorker(
  reason: "boot" | "foreground-tick" | "visibility" | "manual" | "permission-granted"
) {
  await postToServiceWorker({
    type: "FAMTASTIC_EVALUATE_REMINDERS",
    reason
  });
}

export async function showNotificationPreview(title: string, body: string, url: string) {
  const registration = await resolveServiceWorkerRegistration();

  if (!registration?.active) {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, {
        body
      });
    }

    return;
  }

  await postToServiceWorker({
    type: "FAMTASTIC_SHOW_TEST_NOTIFICATION",
    payload: {
      title,
      body,
      url
    }
  });
}

export async function showEventNotification(
  title: string,
  body: string,
  url: string,
  options?: {
    tag?: string;
    requireInteraction?: boolean;
  }
) {
  const registration = await resolveServiceWorkerRegistration();

  if (!registration?.active) {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, {
        body
      });
    }

    return;
  }

  await postToServiceWorker({
    type: "FAMTASTIC_SHOW_EVENT_NOTIFICATION",
    payload: {
      title,
      body,
      url,
      tag: options?.tag,
      requireInteraction: options?.requireInteraction
    }
  });
}

export async function registerReminderBackgroundChecks() {
  const registration = await resolveServiceWorkerRegistration();

  if (!registration) {
    return;
  }

  await registration.sync?.register?.("famtastic-reminder-check").catch(() => undefined);
  await registration.periodicSync?.register?.("famtastic-reminder-check", { minInterval: 15 * 60 * 1000 }).catch(() => undefined);
}

export async function subscribeToPushNotifications(applicationServerKey: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Service workers are not supported in this browser.");
  }

  const registration = await resolveServiceWorkerRegistration();

  if (!registration) {
    throw new Error("The Famtastic service worker is not ready yet. Reload once the app is installed.");
  }

  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8Array(applicationServerKey)
    }));

  const serialized = subscription.toJSON();

  if (!serialized.keys?.p256dh || !serialized.keys?.auth) {
    throw new Error("Unable to read push subscription keys.");
  }

  const payload: PushSubscriptionRecord = {
    endpoint: serialized.endpoint ?? subscription.endpoint,
    expirationTime: serialized.expirationTime ?? subscription.expirationTime ?? null,
    keys: {
      p256dh: serialized.keys.p256dh,
      auth: serialized.keys.auth
    }
  };

  return {
    subscription,
    payload
  };
}

export async function unsubscribeFromPushNotifications() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await resolveServiceWorkerRegistration();

  if (!registration) {
    return null;
  }

  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return null;
  }

  await subscription.unsubscribe();
  return subscription.endpoint;
}
