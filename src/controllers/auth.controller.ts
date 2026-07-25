import type { Request, Response } from "express";

import { registerSchema } from "../schemas/auth.schema.js";
import { registerUser } from "../services/auth.service.js";
import { validationErrorFromZod } from "../utils/zod-error.js";

export async function register(
  request: Request,
  response: Response,
): Promise<void> {
  const result = registerSchema.safeParse(request.body);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  const user = await registerUser(result.data);

  response.status(201).json({
    data: user,
  });
}
