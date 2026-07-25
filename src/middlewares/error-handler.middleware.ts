import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";
import { randomUUID } from "node:crypto";

import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

type HttpParserError = {
  type?: unknown;
  status?: unknown;
  body?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInvalidJsonError(error: unknown): error is HttpParserError {
  return (
    isRecord(error) &&
    error.type === "entity.parse.failed" &&
    error.status === 400 &&
    "body" in error
  );
}

function isRequestBodyTooLargeError(error: unknown): error is HttpParserError {
  return (
    isRecord(error) &&
    error.type === "entity.too.large" &&
    error.status === 413
  );
}

function ensureRequestId(request: Request, response: Response): string {
  const requestId = request.requestId || randomUUID();

  request.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);

  return requestId;
}

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

  const requestId = ensureRequestId(request, response);

  if (isInvalidJsonError(error)) {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON",
        details: null,
        requestId,
      },
    });
    return;
  }

  if (isRequestBodyTooLargeError(error)) {
    response.status(413).json({
      error: {
        code: "REQUEST_BODY_TOO_LARGE",
        message: "Request body is too large",
        details: null,
        requestId,
      },
    });
    return;
  }

  if (error instanceof AppError && error.isOperational) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
        requestId,
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
      details: null,
      requestId,
      ...developmentDetails,
    },
  });
};
