import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import { UserRole } from "../generated/prisma/client.js";
import type { CreateDoctorInput } from "../schemas/doctor.schema.js";

const doctorSelect = {
  id: true,
  userId: true,
  specialtyId: true,
  professionalLicense: true,
  isActive: true,
} as const;

const doctorListSelect = {
  id: true,
  userId: true,
  professionalLicense: true,
  isActive: true,
  user: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
  specialty: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

function userNotFoundError(): AppError {
  return new AppError({
    statusCode: 404,
    code: "USER_NOT_FOUND",
    message: "User not found",
    details: null,
  });
}

function userIsNotDoctorError(): AppError {
  return new AppError({
    statusCode: 409,
    code: "USER_IS_NOT_DOCTOR",
    message: "User is not a doctor",
  });
}

function doctorAlreadyExistsError(): AppError {
  return new AppError({
    statusCode: 409,
    code: "DOCTOR_ALREADY_EXISTS",
    message: "A doctor profile already exists for this user",
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

function doctorLicenseAlreadyExistsError(): AppError {
  return new AppError({
    statusCode: 409,
    code: "DOCTOR_LICENSE_ALREADY_EXISTS",
    message: "A doctor with this professional license already exists",
  });
}

export async function createDoctor(input: CreateDoctorInput) {
  const user = await prisma.user.findUnique({
    where: {
      id: input.userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw userNotFoundError();
  }

  if (user.role !== UserRole.DOCTOR) {
    throw userIsNotDoctorError();
  }

  const existingDoctorForUser = await prisma.doctor.findUnique({
    where: {
      userId: input.userId,
    },
    select: {
      id: true,
    },
  });

  if (existingDoctorForUser) {
    throw doctorAlreadyExistsError();
  }

  const specialty = await prisma.specialty.findUnique({
    where: {
      id: input.specialtyId,
    },
    select: {
      id: true,
    },
  });

  if (!specialty) {
    throw specialtyNotFoundError();
  }

  const existingDoctorWithLicense = await prisma.doctor.findUnique({
    where: {
      professionalLicense: input.professionalLicense,
    },
    select: {
      id: true,
    },
  });

  if (existingDoctorWithLicense) {
    throw doctorLicenseAlreadyExistsError();
  }

  return prisma.doctor.create({
    data: {
      userId: input.userId,
      specialtyId: input.specialtyId,
      professionalLicense: input.professionalLicense,
      isActive: true,
    },
    select: doctorSelect,
  });
}

export async function getDoctors() {
  const doctors = await prisma.doctor.findMany({
    where: {
      isActive: true,
      user: {
        isActive: true,
      },
      specialty: {
        isActive: true,
      },
    },
    orderBy: [
      {
        user: {
          lastName: "asc",
        },
      },
      {
        user: {
          firstName: "asc",
        },
      },
    ],
    select: doctorListSelect,
  });

  return doctors.map((doctor) => ({
    id: doctor.id,
    userId: doctor.userId,
    firstName: doctor.user.firstName,
    lastName: doctor.user.lastName,
    specialty: {
      id: doctor.specialty.id,
      name: doctor.specialty.name,
    },
    professionalLicense: doctor.professionalLicense,
    isActive: doctor.isActive,
  }));
}
