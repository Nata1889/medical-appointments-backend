import { Router } from "express";

import {
  createDoctor,
  deleteDoctor,
  getDoctorAppointmentById,
  getDoctorAppointments,
  getDoctorAvailableSlots,
  getDoctorById,
  getDoctors,
  updateDoctorAppointmentStatus,
  updateDoctor,
} from "../controllers/doctor.controller.js";
import { UserRole } from "../generated/prisma/client.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";

export const doctorRouter = Router();

doctorRouter.get(
  "/",
  authenticate,
  getDoctors,
);

doctorRouter.get(
  "/me/appointments",
  authenticate,
  authorize(UserRole.DOCTOR),
  getDoctorAppointments,
);

doctorRouter.get(
  "/me/appointments/:id",
  authenticate,
  authorize(UserRole.DOCTOR),
  getDoctorAppointmentById,
);

doctorRouter.patch(
  "/me/appointments/:id/status",
  authenticate,
  authorize(UserRole.DOCTOR),
  updateDoctorAppointmentStatus,
);

doctorRouter.get(
  "/:id/slots",
  authenticate,
  authorize(UserRole.PATIENT, UserRole.ADMIN),
  getDoctorAvailableSlots,
);

doctorRouter.get(
  "/:id",
  authenticate,
  getDoctorById,
);

doctorRouter.patch(
  "/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  updateDoctor,
);

doctorRouter.delete(
  "/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  deleteDoctor,
);

doctorRouter.post(
  "/",
  authenticate,
  authorize(UserRole.ADMIN),
  createDoctor,
);
