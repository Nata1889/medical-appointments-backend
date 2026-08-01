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

export type CreateSpecialtyInput = z.infer<typeof createSpecialtySchema>;
