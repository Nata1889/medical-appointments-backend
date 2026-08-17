import { z } from "zod";

import { registerSchema } from "./auth.schema.js";

export const createDoctorSchema = z
  .object({
    firstName: registerSchema.shape.firstName,
    lastName: registerSchema.shape.lastName,
    email: registerSchema.shape.email,
    password: registerSchema.shape.password,
    specialtyId: z
      .string({ error: "Specialty ID is required" })
      .uuid("Specialty ID must be a valid UUID"),
    professionalLicense: z
      .string({ error: "Professional license is required" })
      .trim()
      .min(3, "Professional license must be at least 3 characters")
      .max(100, "Professional license must be at most 100 characters"),
  })
  .strict();

export const doctorIdParamsSchema = z
  .object({
    id: z.string({ error: "Doctor ID is required" }).uuid("Doctor ID must be a valid UUID"),
  })
  .strict();

export const getDoctorSlotsQuerySchema = z
  .object({
    date: z
      .string({ error: "Date is required" })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
      .refine((value) => {
        const [yearValue, monthValue, dayValue] = value.split("-");
        const year = Number(yearValue);
        const month = Number(monthValue);
        const day = Number(dayValue);
        const date = new Date(Date.UTC(year, month - 1, day));

        return (
          date.getUTCFullYear() === year &&
          date.getUTCMonth() === month - 1 &&
          date.getUTCDate() === day
        );
      }, "Date must be a valid calendar date"),
  })
  .strict();

export const updateDoctorSchema = z
  .object({
    specialtyId: z
      .string({ error: "Specialty ID must be a string" })
      .uuid("Specialty ID must be a valid UUID")
      .optional(),
    professionalLicense: z
      .string({ error: "Professional license must be a string" })
      .trim()
      .min(3, "Professional license must be at least 3 characters")
      .max(100, "Professional license must be at most 100 characters")
      .optional(),
    isActive: z.boolean({ error: "isActive must be a boolean" }).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type DoctorIdParams = z.infer<typeof doctorIdParamsSchema>;
export type GetDoctorSlotsQuery = z.infer<typeof getDoctorSlotsQuerySchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
