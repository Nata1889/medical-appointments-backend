import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { UserRole } from "../generated/prisma/client.js";

function authenticationRequiredError(): AppError {
  return new AppError({
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Authentication required",
  });
}

function insufficientPermissionsError(): AppError {
  return new AppError({
    statusCode: 403,
    code: "FORBIDDEN",
    message: "Insufficient permissions",
  });
}

export function authorize(...roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(authenticationRequiredError());
      return;
    }

    if (!roles.includes(request.user.role)) {
      next(insufficientPermissionsError());
      return;
    }

    next();
  };
}
