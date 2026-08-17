export async function futureLocalDate(daysFromToday: number): Promise<string> {
  const { addDaysToLocalDate, getAppointmentLocalDateString } = await import("../../src/utils/appointment-time.js");
  const today = getAppointmentLocalDateString(new Date());

  if (!today) {
    throw new Error("Could not determine local test date");
  }

  return addDaysToLocalDate(today, daysFromToday);
}

export function localMinuteLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Cordoba",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
