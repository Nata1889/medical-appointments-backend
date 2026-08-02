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

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
