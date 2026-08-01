import { Router } from "express";

import { getCurrentUser, login, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { UserRole } from "../generated/prisma/client.js";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/me", authenticate, getCurrentUser);
authRouter.get("/admin", authenticate, authorize(UserRole.ADMIN), (_request, response) => {
  response.status(200).json({
    data: {
      role: UserRole.ADMIN,
    },
  });
});
authRouter.get("/doctor", authenticate, authorize(UserRole.DOCTOR), (_request, response) => {
  response.status(200).json({
    data: {
      role: UserRole.DOCTOR,
    },
  });
});
authRouter.get("/patient", authenticate, authorize(UserRole.PATIENT), (_request, response) => {
  response.status(200).json({
    data: {
      role: UserRole.PATIENT,
    },
  });
});
