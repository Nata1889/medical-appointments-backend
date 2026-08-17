import { describe, expect, test } from "vitest";

import { getAppointmentLocalTime, localDateTimeToAppointmentDate } from "../../src/utils/appointment-time.js";

describe("appointment time utilities", () => {
  test("converts local Cordoba appointment time to the matching Date instant", () => {
    const date = "2026-09-07";
    const scheduledAt = localDateTimeToAppointmentDate(date, 9 * 60);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Cordoba",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const values = new Map(formatter.formatToParts(scheduledAt).map((part) => [part.type, part.value]));

    expect(values.get("year")).toBe("2026");
    expect(values.get("month")).toBe("09");
    expect(values.get("day")).toBe("07");
    expect(values.get("hour")).toBe("09");
    expect(values.get("minute")).toBe("00");
    expect(values.get("second")).toBe("00");

    const localTime = getAppointmentLocalTime(scheduledAt);

    expect(localTime?.minuteOfDay).toBe(540);
    expect(localTime?.second).toBe(0);
  });
});
