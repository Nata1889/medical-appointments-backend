import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { CreateAvailabilityInput } from "../schemas/availability.schema.js";

const availabilitySelect = {
  id: true,
  doctorId: true,
  weekDay: true,
  startTimeMinutes: true,
  endTimeMinutes: true,
  slotDurationMinutes: true,
} as const;

function doctorNotFoundError(): AppError {
  return new AppError({
    statusCode: 404,
    code: "DOCTOR_NOT_FOUND",
    message: "Doctor not found",
    details: null,
  });
}

function availabilityOverlapError(): AppError {
  return new AppError({
    statusCode: 409,
    code: "AVAILABILITY_OVERLAP",
    message: "Availability overlaps an existing block",
    details: null,
  });
}

export async function createAvailability(input: CreateAvailabilityInput) {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: input.doctorId,
      isActive: true,
      user: {
        isActive: true,
      },
      specialty: {
        isActive: true,
      },
    },
    select: {
      id: true,
    },
  });

  if (!doctor) {
    throw doctorNotFoundError();
  }

  const overlappingAvailability = await prisma.availability.findFirst({
    where: {
      doctorId: input.doctorId,
      weekDay: input.weekDay,
      startTimeMinutes: {
        lt: input.endTimeMinutes,
      },
      endTimeMinutes: {
        gt: input.startTimeMinutes,
      },
    },
    select: {
      id: true,
    },
  });

  if (overlappingAvailability) {
    throw availabilityOverlapError();
  }

  return prisma.availability.create({
    data: input,
    select: availabilitySelect,
  });
}
