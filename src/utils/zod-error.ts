import type { ZodError, ZodIssue } from "zod";

import { AppError } from "../errors/app-error.js";

type ValidationDetail = {
  field: string;
  message: string;
};

function getIssueField(issue: ZodIssue): string {
  if (issue.path.length > 0) {
    return String(issue.path[0]);
  }

  return "body";
}

export function validationErrorFromZod(error: ZodError): AppError {
  const details: ValidationDetail[] = error.issues.map((issue) => ({
    field: getIssueField(issue),
    message: issue.message,
  }));

  return new AppError({
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message: "Request validation failed",
    details,
  });
}
