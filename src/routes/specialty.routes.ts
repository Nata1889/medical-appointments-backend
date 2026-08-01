import { Router } from "express";

import {
  createSpecialty,
  deleteSpecialty,
  getSpecialties,
  getSpecialtyById,
  updateSpecialty,
} from "../controllers/specialty.controller.js";
import { UserRole } from "../generated/prisma/client.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";

export const specialtyRouter = Router();

specialtyRouter.get(
  "/",
  authenticate,
  getSpecialties,
);

specialtyRouter.get(
  "/:id",
  authenticate,
  getSpecialtyById,
);

specialtyRouter.patch(
  "/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  updateSpecialty,
);

specialtyRouter.delete(
  "/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  deleteSpecialty,
);

specialtyRouter.post(
  "/",
  authenticate,
  authorize(UserRole.ADMIN),
  createSpecialty,
);
