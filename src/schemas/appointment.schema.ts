import { z } from "zod";

import { AppointmentStatus } from "../generated/prisma/client.js";

const isoDateTimeWithOffsetPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/;

export function isValidIsoDateTimeWithOffset(value: string): boolean {
  const match = isoDateTimeWithOffsetPattern.exec(value);

  if (!match) {
    return false;
  }

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue, , offsetValue] = match;

  if (offsetValue === undefined) {
    return false;
  }

  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = secondValue === undefined ? 0 : Number(secondValue);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return false;
  }

  if (offsetValue !== "Z") {
    const offsetHour = Number(offsetValue.slice(1, 3));
    const offsetMinute = Number(offsetValue.slice(4, 6));

    if (offsetHour > 23 || offsetMinute > 59) {
      return false;
    }
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (day > daysInMonth) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

export const createAppointmentSchema = z
  .object({
    doctorId: z.string({ error: "Doctor ID is required" }).uuid("Doctor ID must be a valid UUID"),
    scheduledAt: z
      .string({ error: "Scheduled date is required" })
      .refine(isValidIsoDateTimeWithOffset, "Scheduled date must be a valid ISO datetime with timezone"),
    reason: z
      .string({ error: "Reason must be a string" })
      .trim()
      .min(1, "Reason must not be empty")
      .max(500, "Reason must be at most 500 characters")
      .optional(),
  })
  .strict();

export const getAppointmentsQuerySchema = z
  .object({
    status: z.enum(AppointmentStatus, { error: "Appointment status must be valid" }).optional(),
    from: z
      .string({ error: "From date must be a string" })
      .refine(isValidIsoDateTimeWithOffset, "From date must be a valid ISO datetime with timezone")
      .optional(),
    to: z
      .string({ error: "To date must be a string" })
      .refine(isValidIsoDateTimeWithOffset, "To date must be a valid ISO datetime with timezone")
      .optional(),
  })
  .strict()
  .refine(
    (value) => {
      if (value.from === undefined || value.to === undefined) {
        return true;
      }

      return new Date(value.from).getTime() <= new Date(value.to).getTime();
    },
    {
      message: "From date must be before or equal to to date",
      path: ["from"],
    },
  );

export const appointmentIdParamsSchema = z
  .object({
    id: z.string({ error: "Appointment ID is required" }).uuid("Appointment ID must be a valid UUID"),
  })
  .strict();

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type GetAppointmentsQuery = z.infer<typeof getAppointmentsQuerySchema>;
export type AppointmentIdParams = z.infer<typeof appointmentIdParamsSchema>;
