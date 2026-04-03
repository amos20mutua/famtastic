import { createStore, del, get, set } from "idb-keyval";
import type { DeviceNotificationSchedule, NotificationDeliveryRecord } from "@/data/types";

const notificationStore = createStore("famtastic-notifications", "notification-runtime");
const SCHEDULE_KEY = "active-schedule";
const DELIVERIES_KEY = "delivery-records";

export async function loadStoredNotificationSchedule() {
  return get<DeviceNotificationSchedule | undefined>(SCHEDULE_KEY, notificationStore);
}

export async function saveStoredNotificationSchedule(schedule: DeviceNotificationSchedule) {
  return set(SCHEDULE_KEY, schedule, notificationStore);
}

export async function clearStoredNotificationSchedule() {
  return del(SCHEDULE_KEY, notificationStore);
}

export async function loadNotificationDeliveries() {
  const deliveries = (await get<NotificationDeliveryRecord[] | undefined>(DELIVERIES_KEY, notificationStore)) ?? [];

  return deliveries.map((delivery) => ({
    ...delivery,
    deliveryCount: delivery.deliveryCount ?? 1,
    tag: delivery.tag ?? ""
  }));
}

export async function saveNotificationDeliveries(deliveries: NotificationDeliveryRecord[]) {
  return set(DELIVERIES_KEY, deliveries, notificationStore);
}
