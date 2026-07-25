import bcrypt from "bcrypt";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import { Prisma, UserRole } from "../generated/prisma/client.js";
import type { RegisterInput } from "../schemas/auth.schema.js";

const PASSWORD_SALT_ROUNDS = 12;

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

function isEmailUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;

  return Array.isArray(target) && target.includes("email");
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
    return await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash,
        role: UserRole.PATIENT,
      },
      select: safeUserSelect,
    });
  } catch (error: unknown) {
    if (isEmailUniqueConstraintError(error)) {
      throw emailAlreadyRegisteredError();
    }

    throw error;
  }
}
