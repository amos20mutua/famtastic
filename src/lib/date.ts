import {
  format,
  formatDistanceToNowStrict,
  isSameDay,
  isToday,
  isTomorrow,
  parseISO
} from "date-fns";

export function formatClock(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "h:mm a");
}

export function formatCalendarLabel(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;

  if (isToday(date)) {
    return "Today";
  }

  if (isTomorrow(date)) {
    return "Tomorrow";
  }

  return format(date, "EEE, MMM d");
}

export function formatCalendarDate(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "EEEE, MMMM d");
}

export function formatShortDate(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "MMM d");
}

export function formatRelativeWindow(value: string | Date, now = new Date()) {
  const date = typeof value === "string" ? parseISO(value) : value;
  const suffix = formatDistanceToNowStrict(date, { addSuffix: true });
  return suffix.replace("about ", "");
}

export function matchesDate(value: string, date: Date) {
  return isSameDay(parseISO(value), date);
}

export function toDateInputValue(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "yyyy-MM-dd");
}
