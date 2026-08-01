import { z } from "zod";

export const createSpecialtySchema = z
  .object({
    name: z
      .string({ error: "Specialty name is required" })
      .trim()
      .min(2, "Specialty name must be at least 2 characters")
      .max(100, "Specialty name must be at most 100 characters"),
    description: z
      .string({ error: "Specialty description must be a string" })
      .max(500, "Specialty description must be at most 500 characters")
      .optional(),
  })
  .strict();

export const specialtyIdParamsSchema = z
  .object({
    id: z.string({ error: "Specialty ID is required" }).uuid("Specialty ID must be a valid UUID"),
  })
  .strict();

export const updateSpecialtySchema = z
  .object({
    name: z
      .string({ error: "Specialty name must be a string" })
      .trim()
      .min(2, "Specialty name must be at least 2 characters")
      .max(100, "Specialty name must be at most 100 characters")
      .optional(),
    description: z
      .string({ error: "Specialty description must be a string" })
      .max(500, "Specialty description must be at most 500 characters")
      .optional(),
    isActive: z.boolean({ error: "Specialty active status must be a boolean" }).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateSpecialtyInput = z.infer<typeof createSpecialtySchema>;
export type SpecialtyIdParams = z.infer<typeof specialtyIdParamsSchema>;
export type UpdateSpecialtyInput = z.infer<typeof updateSpecialtySchema>;
