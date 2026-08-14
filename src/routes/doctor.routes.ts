import { Router } from "express";

import {
  createDoctor,
  deleteDoctor,
  getDoctorById,
  getDoctors,
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
