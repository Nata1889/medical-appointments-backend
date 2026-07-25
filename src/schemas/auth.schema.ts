import { z } from "zod";

export const registerSchema = z
  .object({
    firstName: z
      .string({ error: "First name is required" })
      .trim()
      .min(2, "First name must be at least 2 characters")
      .max(100, "First name must be at most 100 characters"),
    lastName: z
      .string({ error: "Last name is required" })
      .trim()
      .min(2, "Last name must be at least 2 characters")
      .max(100, "Last name must be at most 100 characters"),
    email: z
      .string({ error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email")
      .max(254, "Email must be at most 254 characters"),
    password: z
      .string({ error: "Password is required" })
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
