import { Router } from "express";

import { createAppointment } from "../controllers/appointment.controller.js";
import { UserRole } from "../generated/prisma/client.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";

export const appointmentRouter = Router();

appointmentRouter.post(
  "/",
  authenticate,
  authorize(UserRole.PATIENT),
  createAppointment,
);
