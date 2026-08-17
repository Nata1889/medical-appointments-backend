import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import { Prisma, UserRole } from "../generated/prisma/client.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";

const PASSWORD_SALT_ROUNDS = 12;
// Used only to avoid skipping bcrypt.compare when the submitted email does not exist.
const DUMMY_PASSWORD_HASH =
  "$2b$12$ZxhEzpad88mW1GyP0HOymuHD6Z9VnsVwEn6/QCLdAs5as/bATBl8S";
type JwtExpiresIn = NonNullable<SignOptions["expiresIn"]>;

const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

function emailAlreadyRegisteredError(): AppError {
  return new AppError({
    statusCode: 409,
    code: "EMAIL_ALREADY_REGISTERED",
    message: "An account with this email already exists",
  });
}

function invalidCredentialsError(): AppError {
  return new AppError({
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password",
  });
}

function authenticationRequiredError(): AppError {
  return new AppError({
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Authentication required",
    details: null,
  });
}

function isEmailUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.includes("email");
  }

  if (typeof target === "string") {
    return target.includes("email");
  }

  return error.message.includes("email");
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw emailAlreadyRegisteredError();
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          passwordHash,
          role: UserRole.PATIENT,
        },
        select: safeUserSelect,
      });

      await tx.patient.create({
        data: {
          userId: user.id,
        },
      });

      return user;
    });
  } catch (error: unknown) {
    if (isEmailUniqueConstraintError(error)) {
      throw emailAlreadyRegisteredError();
    }

    throw error;
  }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });

  const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await bcrypt.compare(input.password, passwordHash);

  if (!user || !passwordMatches || !user.isActive) {
    throw invalidCredentialsError();
  }

  const safeUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };

  const tokenOptions: SignOptions = {
    algorithm: "HS256",
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as JwtExpiresIn,
    issuer: "medical-appointments-api",
    audience: "medical-appointments-client",
  };

  const accessToken = jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    tokenOptions,
  );

  return {
    user: safeUser,
    accessToken,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw authenticationRequiredError();
  }

  return user;
}
