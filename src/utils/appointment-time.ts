import { AppointmentStatus, WeekDay } from "../generated/prisma/client.js";

export const APPOINTMENT_TIME_ZONE = "America/Argentina/Cordoba";
export const ACTIVE_APPOINTMENT_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
] as const;

const weekDayByName: Record<string, WeekDay> = {
  Monday: WeekDay.MONDAY,
  Tuesday: WeekDay.TUESDAY,
  Wednesday: WeekDay.WEDNESDAY,
  Thursday: WeekDay.THURSDAY,
  Friday: WeekDay.FRIDAY,
  Saturday: WeekDay.SATURDAY,
  Sunday: WeekDay.SUNDAY,
};

const appointmentDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APPOINTMENT_TIME_ZONE,
  weekday: "long",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getAppointmentDateTimeParts(date: Date) {
  const parts = appointmentDateTimeFormatter.formatToParts(date);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));
  const weekDayName = valueByType.get("weekday");
  const yearValue = valueByType.get("year");
  const monthValue = valueByType.get("month");
  const dayValue = valueByType.get("day");
  const hourValue = valueByType.get("hour");
  const minuteValue = valueByType.get("minute");
  const secondValue = valueByType.get("second");

  if (
    !weekDayName ||
    !yearValue ||
    !monthValue ||
    !dayValue ||
    !hourValue ||
    !minuteValue ||
    !secondValue
  ) {
    return null;
  }

  const weekDay = weekDayByName[weekDayName];

  if (!weekDay) {
    return null;
  }

  return {
    weekDay,
    year: Number(yearValue),
    month: Number(monthValue),
    day: Number(dayValue),
    hour: Number(hourValue),
    minute: Number(minuteValue),
    second: Number(secondValue),
  };
}

export function getAppointmentLocalTime(scheduledAt: Date): {
  weekDay: WeekDay;
  minuteOfDay: number;
  second: number;
} | null {
  const parts = getAppointmentDateTimeParts(scheduledAt);

  if (!parts) {
    return null;
  }

  return {
    weekDay: parts.weekDay,
    minuteOfDay: parts.hour * 60 + parts.minute,
    second: parts.second,
  };
}

export function localDateTimeToAppointmentDate(date: string, minuteOfDay: number): Date {
  const [yearValue, monthValue, dayValue] = date.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const guessDate = new Date(utcGuess);
  const guessParts = getAppointmentDateTimeParts(guessDate);

  if (!guessParts) {
    return guessDate;
  }

  const localAsUtc = Date.UTC(
    guessParts.year,
    guessParts.month - 1,
    guessParts.day,
    guessParts.hour,
    guessParts.minute,
    guessParts.second,
    0,
  );
  const offsetMilliseconds = localAsUtc - utcGuess;

  return new Date(utcGuess - offsetMilliseconds);
}

export function addDaysToLocalDate(date: string, days: number): string {
  const [yearValue, monthValue, dayValue] = date.split("-");
  const nextDate = new Date(
    Date.UTC(Number(yearValue), Number(monthValue) - 1, Number(dayValue) + days),
  );

  return nextDate.toISOString().slice(0, 10);
}

export function getAppointmentLocalDateString(date: Date): string | null {
  const parts = getAppointmentDateTimeParts(date);

  if (!parts) {
    return null;
  }

  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}
