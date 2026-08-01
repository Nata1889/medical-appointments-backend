import { Router } from "express";

import { getCurrentUser, login, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/me", authenticate, getCurrentUser);
