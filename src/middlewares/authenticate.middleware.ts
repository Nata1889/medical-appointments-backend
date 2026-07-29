import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { UserRole } from "../generated/prisma/client.js";

const TOKEN_ISSUER = "medical-appointments-api";
const TOKEN_AUDIENCE = "medical-appointments-client";
const USER_ROLES: readonly string[] = Object.values(UserRole);

function authenticationRequiredError(): AppError {
  return new AppError({
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Authentication required",
  });
}

function invalidAuthenticationTokenError(): AppError {
  return new AppError({
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Invalid authentication token",
  });
}

function authenticationTokenExpiredError(): AppError {
  return new AppError({
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Authentication token expired",
  });
}

function parseBearerToken(authorization: string | undefined): string {
  if (!authorization) {
    throw authenticationRequiredError();
  }

  const [scheme, token, extra] = authorization.split(" ");

  if (scheme !== "Bearer" || !token || extra) {
    throw invalidAuthenticationTokenError();
  }

  return token;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value);
}

export function authenticate(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  try {
    const token = parseBearerToken(request.get("authorization"));
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      !isUserRole(payload.role)
    ) {
      throw invalidAuthenticationTokenError();
    }

    request.user = {
      userId: payload.sub,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      next(authenticationTokenExpiredError());
      return;
    }

    next(invalidAuthenticationTokenError());
  }
}
