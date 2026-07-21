import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .max(65535)
    .default(4000),

  FRONTEND_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) =>
        value.startsWith("postgresql://") ||
        value.startsWith("postgres://"),
      {
        message:
          "DATABASE_URL must be a PostgreSQL connection string"
      }
    )
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(z.treeifyError(result.error));

  process.exit(1);
}

export const env = result.data;