import "./test-env.js";

import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import type { UserRole } from "../../src/generated/prisma/client.js";

type JwtExpiresIn = NonNullable<SignOptions["expiresIn"]>;

export async function signTestToken(user: { id: string; role: UserRole }): Promise<string> {
  const { env } = await import("../../src/config/env.js");

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: "HS256",
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as JwtExpiresIn,
      issuer: "medical-appointments-api",
      audience: "medical-appointments-client",
    },
  );
}
