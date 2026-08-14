import { z } from "zod";

import { WeekDay } from "../generated/prisma/client.js";

export const createAvailabilitySchema = z
  .object({
    doctorId: z.string({ error: "Doctor ID is required" }).uuid("Doctor ID must be a valid UUID"),
    weekDay: z.enum(WeekDay, { error: "Week day is required" }),
    startTimeMinutes: z
      .number({ error: "Start time must be a number" })
      .int("Start time must be an integer")
      .min(0, "Start time must be at least 0")
      .max(1439, "Start time must be at most 1439"),
    endTimeMinutes: z
      .number({ error: "End time must be a number" })
      .int("End time must be an integer")
      .min(1, "End time must be at least 1")
      .max(1440, "End time must be at most 1440"),
    slotDurationMinutes: z
      .number({ error: "Slot duration must be a number" })
      .int("Slot duration must be an integer")
      .positive("Slot duration must be greater than 0"),
  })
  .strict()
  .refine((value) => value.startTimeMinutes < value.endTimeMinutes, {
    message: "Start time must be before end time",
    path: ["startTimeMinutes"],
  })
  .refine(
    (value) => (value.endTimeMinutes - value.startTimeMinutes) >= value.slotDurationMinutes,
    {
      message: "Slot duration must fit within the availability block",
      path: ["slotDurationMinutes"],
    },
  )
  .refine(
    (value) => (value.endTimeMinutes - value.startTimeMinutes) % value.slotDurationMinutes === 0,
    {
      message: "Slot duration must divide the availability block evenly",
      path: ["slotDurationMinutes"],
    },
  );

export const getAvailabilitiesQuerySchema = z
  .object({
    doctorId: z.string().uuid("Doctor ID must be a valid UUID").optional(),
    weekDay: z.enum(WeekDay, { error: "Week day must be valid" }).optional(),
  })
  .strict();

export const availabilityIdParamsSchema = z
  .object({
    id: z.string({ error: "Availability ID is required" }).uuid("Availability ID must be a valid UUID"),
  })
  .strict();

export const updateAvailabilitySchema = z
  .object({
    doctorId: z.string().uuid("Doctor ID must be a valid UUID").optional(),
    weekDay: z.enum(WeekDay, { error: "Week day must be valid" }).optional(),
    startTimeMinutes: z
      .number({ error: "Start time must be a number" })
      .int("Start time must be an integer")
      .min(0, "Start time must be at least 0")
      .max(1439, "Start time must be at most 1439")
      .optional(),
    endTimeMinutes: z
      .number({ error: "End time must be a number" })
      .int("End time must be an integer")
      .min(1, "End time must be at least 1")
      .max(1440, "End time must be at most 1440")
      .optional(),
    slotDurationMinutes: z
      .number({ error: "Slot duration must be a number" })
      .int("Slot duration must be an integer")
      .positive("Slot duration must be greater than 0")
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
export type GetAvailabilitiesQuery = z.infer<typeof getAvailabilitiesQuerySchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
