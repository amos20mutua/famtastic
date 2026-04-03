/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import type { ServiceWorkerMessage } from "@/data/types";
import {
  clearStoredNotificationSchedule,
  loadNotificationDeliveries,
  loadStoredNotificationSchedule,
  saveNotificationDeliveries,
  saveStoredNotificationSchedule
} from "@/lib/notification-storage";
import { evaluateNotificationTask, nextDeliveryRecord } from "@/lib/notification-runtime";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    url: string;
    revision: string | null;
  }>;
};

interface TaggedExtendableEvent extends ExtendableEvent {
  tag: string;
}

const APP_ICON = "/icons/icon-main.svg";
const FALLBACK_URL = "/app/notifications";

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
clientsClaim();

registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

async function focusOrOpenClient(url: string) {
  const target = new URL(url, self.location.origin).href;
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  for (const client of windows) {
    const windowClient = client as WindowClient;

    if ("focus" in windowClient) {
      if (windowClient.url === target) {
        await windowClient.focus();
        return;
      }

      if ("navigate" in windowClient) {
        await windowClient.navigate(target);
      }

      await windowClient.focus();
      return;
    }
  }

  await self.clients.openWindow(target);
}

async function closeNotificationsByTag(tag: string) {
  if (!tag) {
    return;
  }

  const notifications = await self.registration.getNotifications();

  notifications
    .filter((notification) => notification.tag === tag)
    .forEach((notification) => notification.close());
}

async function closeAllFamtasticNotifications() {
  const notifications = await self.registration.getNotifications();

  notifications
    .filter((notification) => typeof notification.tag === "string" && notification.tag.startsWith("famtastic-"))
    .forEach((notification) => notification.close());
}

async function showPanelNotification(
  title: string,
  body: string,
  options?: {
    tag?: string;
    url?: string;
    requireInteraction?: boolean;
    data?: Record<string, unknown>;
  }
) {
  await self.registration.showNotification(title, {
    body,
    icon: APP_ICON,
    badge: APP_ICON,
    tag: options?.tag,
    requireInteraction: options?.requireInteraction,
    renotify: Boolean(options?.requireInteraction),
    data: {
      url: options?.url ?? FALLBACK_URL,
      ...(options?.data ?? {})
    }
  } as NotificationOptions);
}

async function evaluateAndNotify(reason: string) {
  const schedule = await loadStoredNotificationSchedule();
  const now = new Date();
  const existingDeliveries = await loadNotificationDeliveries();
  const deliveryMap = new Map(existingDeliveries.map((record) => [record.taskId, record]));
  const activeTaskIds = new Set(schedule?.tasks.map((task) => task.id) ?? []);

  for (const staleRecord of existingDeliveries) {
    if (!activeTaskIds.has(staleRecord.taskId)) {
      await closeNotificationsByTag(staleRecord.tag);
      deliveryMap.delete(staleRecord.taskId);
    }
  }

  if (!schedule || schedule.tasks.length === 0) {
    await saveNotificationDeliveries([...deliveryMap.values()]);
    return;
  }

  for (const task of schedule.tasks) {
    const payload = evaluateNotificationTask(schedule, task, deliveryMap, now);

    if (!payload) {
      continue;
    }

    await showPanelNotification(payload.title, payload.body, {
      tag: payload.tag,
      url: payload.url,
      requireInteraction: payload.state === "overdue",
      data: {
        taskId: payload.taskId,
        state: payload.state,
        reason
      }
    });

    deliveryMap.set(task.id, nextDeliveryRecord(payload, now));
  }

  await saveNotificationDeliveries([...deliveryMap.values()]);
}

self.addEventListener("activate", (event) => {
  event.waitUntil(evaluateAndNotify("activate"));
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const message = event.data as ServiceWorkerMessage | undefined;

  if (!message) {
    return;
  }

  if (message.type === "FAMTASTIC_SYNC_REMINDERS") {
    event.waitUntil(saveStoredNotificationSchedule(message.payload).then(() => evaluateAndNotify("sync-message")));
    return;
  }

  if (message.type === "FAMTASTIC_CLEAR_SESSION") {
    event.waitUntil(
      Promise.all([closeAllFamtasticNotifications(), clearStoredNotificationSchedule(), saveNotificationDeliveries([])])
    );
    return;
  }

  if (message.type === "FAMTASTIC_EVALUATE_REMINDERS") {
    event.waitUntil(evaluateAndNotify(message.reason));
    return;
  }

  if (message.type === "FAMTASTIC_SHOW_TEST_NOTIFICATION") {
    event.waitUntil(
      showPanelNotification(message.payload.title, message.payload.body, {
        tag: "famtastic-test-notification",
        url: message.payload.url
      })
    );
    return;
  }

  if (message.type === "FAMTASTIC_SHOW_EVENT_NOTIFICATION") {
    event.waitUntil(
      showPanelNotification(message.payload.title, message.payload.body, {
        tag: message.payload.tag ?? "famtastic-event-notification",
        url: message.payload.url,
        requireInteraction: message.payload.requireInteraction
      })
    );
  }
});

self.addEventListener(
  "sync" as never,
  ((event: Event) => {
    const syncEvent = event as TaggedExtendableEvent;

    if (syncEvent.tag !== "famtastic-reminder-check") {
      return;
    }

    syncEvent.waitUntil(evaluateAndNotify("sync"));
  }) as EventListener
);

self.addEventListener(
  "periodicsync" as never,
  ((event: Event) => {
    const periodicEvent = event as TaggedExtendableEvent;

    if (periodicEvent.tag !== "famtastic-reminder-check") {
      return;
    }

    periodicEvent.waitUntil(evaluateAndNotify("periodic-sync"));
  }) as EventListener
);

self.addEventListener("push", (event) => {
  if (!event.data) {
    event.waitUntil(evaluateAndNotify("push-empty"));
    return;
  }

  const payload = event.data.json() as {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
    requireInteraction?: boolean;
  };

  event.waitUntil(
    showPanelNotification(payload.title ?? "Famtastic reminder", payload.body ?? "There is an important family reminder waiting for you.", {
      tag: payload.tag ?? "famtastic-push",
      url: payload.url ?? FALLBACK_URL,
      requireInteraction: payload.requireInteraction
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  const target = (event.notification.data?.url as string | undefined) ?? FALLBACK_URL;
  event.notification.close();
  event.waitUntil(focusOrOpenClient(target));
});
