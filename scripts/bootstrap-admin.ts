import bcrypt from "bcrypt";

import { prisma } from "../src/config/prisma.js";
import { Prisma, UserRole } from "../src/generated/prisma/client.js";
import { registerSchema } from "../src/schemas/auth.schema.js";

const PASSWORD_SALT_ROUNDS = 12;

type BootstrapErrorCode =
  | "ADMIN_ALREADY_EXISTS"
  | "BOOTSTRAP_ADMIN_VALIDATION_ERROR"
  | "EMAIL_ALREADY_REGISTERED";

class BootstrapError extends Error {
  constructor(readonly code: BootstrapErrorCode) {
    super(code);
    this.name = "BootstrapError";
  }
}

function isEmailUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
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

function readBootstrapInput() {
  const result = registerSchema.safeParse({
    firstName: process.env.BOOTSTRAP_ADMIN_FIRST_NAME,
    lastName: process.env.BOOTSTRAP_ADMIN_LAST_NAME,
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });

  if (!result.success) {
    throw new BootstrapError("BOOTSTRAP_ADMIN_VALIDATION_ERROR");
  }

  return result.data;
}

async function bootstrapAdmin(): Promise<string> {
  const input = readBootstrapInput();

  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: UserRole.ADMIN,
    },
    select: {
      id: true,
    },
  });

  if (existingAdmin) {
    throw new BootstrapError("ADMIN_ALREADY_EXISTS");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new BootstrapError("EMAIL_ALREADY_REGISTERED");
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  try {
    const admin = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: {
        email: true,
      },
    });

    return admin.email;
  } catch (error) {
    if (isEmailUniqueConstraintError(error)) {
      throw new BootstrapError("EMAIL_ALREADY_REGISTERED");
    }

    throw error;
  }
}

try {
  const email = await bootstrapAdmin();
  console.log("ADMIN_CREATED");
  console.log(`email: ${email}`);
} catch (error) {
  if (error instanceof BootstrapError) {
    console.error(error.code);
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await prisma.$disconnect();
}
