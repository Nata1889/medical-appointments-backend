import { Router } from "express";

import { createDoctor } from "../controllers/doctor.controller.js";
import { UserRole } from "../generated/prisma/client.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";

export const doctorRouter = Router();

doctorRouter.post(
  "/",
  authenticate,
  authorize(UserRole.ADMIN),
  createDoctor,
);
