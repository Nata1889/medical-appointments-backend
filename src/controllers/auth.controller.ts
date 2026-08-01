import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import {
  getCurrentUser as getCurrentUserService,
  loginUser,
  registerUser,
} from "../services/auth.service.js";
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

export async function login(
  request: Request,
  response: Response,
): Promise<void> {
  const result = loginSchema.safeParse(request.body);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  const session = await loginUser(result.data);

  response.status(200).json({
    data: session,
  });
}

export async function getCurrentUser(
  request: Request,
  response: Response,
): Promise<void> {
  if (!request.user) {
    throw new AppError({
      statusCode: 401,
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const user = await getCurrentUserService(request.user.userId);

  response.status(200).json({
    data: user,
  });
}
