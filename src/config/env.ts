import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .max(65535),

  FRONTEND_URL: z.string().url(),

  JSON_BODY_LIMIT: z.string().min(1, "JSON_BODY_LIMIT is required"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),

  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .regex(
      /^[1-9]\d*[smhd]$/,
      "JWT_ACCESS_EXPIRES_IN must be a duration like 15m, 1h, 7d, or 30s",
    )
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(z.treeifyError(result.error));

  process.exit(1);
}

export const env = Object.freeze(result.data);

export type Env = typeof env;
