import { Router } from "express";

import {
  cancelAppointment,
  createAppointment,
  getAppointmentById,
  getAppointments,
} from "../controllers/appointment.controller.js";
import { UserRole } from "../generated/prisma/client.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";

export const appointmentRouter = Router();

appointmentRouter.get(
  "/",
  authenticate,
  authorize(UserRole.PATIENT),
  getAppointments,
);

appointmentRouter.get(
  "/:id",
  authenticate,
  authorize(UserRole.PATIENT),
  getAppointmentById,
);

appointmentRouter.patch(
  "/:id/cancel",
  authenticate,
  authorize(UserRole.PATIENT),
  cancelAppointment,
);

appointmentRouter.post(
  "/",
  authenticate,
  authorize(UserRole.PATIENT),
  createAppointment,
);
