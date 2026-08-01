import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type {
  CreateSpecialtyInput,
  UpdateSpecialtyInput,
} from "../schemas/specialty.schema.js";

const specialtySelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
} as const;

function specialtyAlreadyExistsError(): AppError {
  return new AppError({
    statusCode: 409,
    code: "SPECIALTY_ALREADY_EXISTS",
    message: "A specialty with this name already exists",
  });
}

function specialtyNotFoundError(): AppError {
  return new AppError({
    statusCode: 404,
    code: "SPECIALTY_NOT_FOUND",
    message: "Specialty not found",
    details: null,
  });
}

export async function createSpecialty(input: CreateSpecialtyInput) {
  const existingSpecialty = await prisma.specialty.findUnique({
    where: {
      name: input.name,
    },
    select: {
      id: true,
    },
  });

  if (existingSpecialty) {
    throw specialtyAlreadyExistsError();
  }

  const data = {
    name: input.name,
    isActive: true,
    ...(input.description !== undefined ? { description: input.description } : {}),
  };

  return prisma.specialty.create({
    data,
    select: specialtySelect,
  });
}

export async function getSpecialties() {
  return prisma.specialty.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: specialtySelect,
  });
}

export async function getSpecialtyById(id: string) {
  const specialty = await prisma.specialty.findUnique({
    where: {
      id,
    },
    select: specialtySelect,
  });

  if (!specialty || !specialty.isActive) {
    throw specialtyNotFoundError();
  }

  return specialty;
}

export async function updateSpecialty(id: string, input: UpdateSpecialtyInput) {
  const specialty = await prisma.specialty.findUnique({
    where: {
      id,
    },
    select: specialtySelect,
  });

  if (!specialty) {
    throw specialtyNotFoundError();
  }

  if (input.name !== undefined && input.name !== specialty.name) {
    const existingSpecialty = await prisma.specialty.findUnique({
      where: {
        name: input.name,
      },
      select: {
        id: true,
      },
    });

    if (existingSpecialty) {
      throw specialtyAlreadyExistsError();
    }
  }

  const data = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };

  return prisma.specialty.update({
    where: {
      id,
    },
    data,
    select: specialtySelect,
  });
}
