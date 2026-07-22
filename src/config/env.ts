import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .max(65535),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(z.treeifyError(result.error));

  process.exit(1);
}

export const env = Object.freeze(result.data);

export type Env = typeof env;
