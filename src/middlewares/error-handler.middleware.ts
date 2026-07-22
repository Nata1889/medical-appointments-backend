import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";

import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError && error.isOperational) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
    });
    return;
  }

  console.error("Unexpected application error:", {
    method: request.method,
    path: request.originalUrl,
    error,
  });

  const developmentDetails =
    env.NODE_ENV === "development" && error instanceof Error
      ? {
          details: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : {};

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      ...developmentDetails,
    },
  });
};
