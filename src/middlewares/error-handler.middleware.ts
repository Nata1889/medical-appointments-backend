import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";

import { env } from "../config/env.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void => {
  console.error("Unhandled application error:", error);

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
      ...(env.NODE_ENV === "development" && error instanceof Error
        ? { details: error.message }
        : {}),
    },
  });
};
