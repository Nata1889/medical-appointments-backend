import { Router } from "express";

import {
  createSpecialty,
  getSpecialties,
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

specialtyRouter.post(
  "/",
  authenticate,
  authorize(UserRole.ADMIN),
  createSpecialty,
);
