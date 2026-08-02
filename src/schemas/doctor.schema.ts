import { z } from "zod";

export const createDoctorSchema = z
  .object({
    userId: z.string({ error: "User ID is required" }).uuid("User ID must be a valid UUID"),
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
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
