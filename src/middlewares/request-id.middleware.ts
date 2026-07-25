import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

const REQUEST_ID_HEADER = "X-Request-Id";
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

function isValidRequestId(value: unknown): value is string {
  return typeof value === "string" && SAFE_REQUEST_ID_PATTERN.test(value);
}

export function requestId(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incomingRequestId = request.get(REQUEST_ID_HEADER);
  const id = isValidRequestId(incomingRequestId)
    ? incomingRequestId
    : randomUUID();

  request.requestId = id;
  response.setHeader(REQUEST_ID_HEADER, id);

  next();
}
