export {};

import type { UserRole } from "../../generated/prisma/client.js";

declare global {
  namespace Express {
    interface AuthenticatedUser {
      userId: string;
      role: UserRole;
    }

    interface Request {
      requestId: string;
      user?: AuthenticatedUser;
    }
  }
}
