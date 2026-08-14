import { Router } from "express";

import {
  createAvailability,
  getAvailabilities,
  getAvailabilityById,
  updateAvailability,
} from "../controllers/availability.controller.js";
import { UserRole } from "../generated/prisma/client.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";

export const availabilityRouter = Router();

availabilityRouter.get(
  "/",
  authenticate,
  getAvailabilities,
);

availabilityRouter.get(
  "/:id",
  authenticate,
  getAvailabilityById,
);

availabilityRouter.patch(
  "/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  updateAvailability,
);

availabilityRouter.post(
  "/",
  authenticate,
  authorize(UserRole.ADMIN),
  createAvailability,
);
