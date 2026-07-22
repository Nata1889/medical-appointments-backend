type AppErrorOptions = {
  statusCode: number;
  code: string;
  message: string;
  isOperational?: boolean;
  details?: unknown;
};

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational: boolean;
  readonly details?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message);

    this.name = "AppError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.isOperational = options.isOperational ?? true;

    if ("details" in options) {
      this.details = options.details;
    }

    Error.captureStackTrace(this, AppError);
  }
}
