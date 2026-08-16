import cors from "cors";
import express from "express";
import type { Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { AppError } from "./errors/app-error.js";
import { errorHandler } from "./middlewares/error-handler.middleware.js";
import { notFound } from "./middlewares/not-found.middleware.js";
import { requestId } from "./middlewares/request-id.middleware.js";
import { appointmentRouter } from "./routes/appointment.routes.js";
import { availabilityRouter } from "./routes/availability.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { doctorRouter } from "./routes/doctor.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { specialtyRouter } from "./routes/specialty.routes.js";

export const app = express();

app.disable("x-powered-by");

morgan.token<Request, Response>("request-id", (request) => request.requestId);

app.use(requestId);
app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || origin === env.FRONTEND_URL) {
        callback(null, true);
        return;
      }

      callback(
        new AppError({
          statusCode: 403,
          code: "CORS_ORIGIN_NOT_ALLOWED",
          message: "CORS origin is not allowed",
        }),
      );
    },
  }),
);

if (env.NODE_ENV !== "test") {
  app.use(morgan(":request-id :method :url :status :response-time ms"));
}

app.use(
  express.json({
    limit: env.JSON_BODY_LIMIT,
  }),
);

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/appointments", appointmentRouter);
app.use("/doctors", doctorRouter);
app.use("/availabilities", availabilityRouter);
app.use("/specialties", specialtyRouter);

app.use(notFound);

app.use(errorHandler);
