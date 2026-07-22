import express from "express";

import { errorHandler } from "./middlewares/error-handler.middleware.js";
import { notFound } from "./middlewares/not-found.middleware.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.disable("x-powered-by");

app.use(express.json());

app.use("/health", healthRouter);

app.use(notFound);

app.use(errorHandler);
