import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import { WeekDay } from "../generated/prisma/client.js";
import {
  createAvailabilitySchema,
  type CreateAvailabilityInput,
  type GetAvailabilitiesQuery,
  type UpdateAvailabilityInput,
} from "../schemas/availability.schema.js";
import { validationErrorFromZod } from "../utils/zod-error.js";

const availabilitySelect = {
  id: true,
  doctorId: true,
  weekDay: true,
  startTimeMinutes: true,
  endTimeMinutes: true,
  slotDurationMinutes: true,
} as const;

const weekDayOrder: Record<WeekDay, number> = {
  [WeekDay.MONDAY]: 0,
  [WeekDay.TUESDAY]: 1,
  [WeekDay.WEDNESDAY]: 2,
  [WeekDay.THURSDAY]: 3,
  [WeekDay.FRIDAY]: 4,
  [WeekDay.SATURDAY]: 5,
  [WeekDay.SUNDAY]: 6,
};

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

function availabilityNotFoundError(): AppError {
  return new AppError({
    statusCode: 404,
    code: "AVAILABILITY_NOT_FOUND",
    message: "Availability not found",
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

export async function getAvailabilities(filters: GetAvailabilitiesQuery) {
  const availabilities = await prisma.availability.findMany({
    where: {
      ...(filters.doctorId === undefined ? {} : { doctorId: filters.doctorId }),
      ...(filters.weekDay === undefined ? {} : { weekDay: filters.weekDay }),
    },
    select: availabilitySelect,
  });

  return availabilities.sort((left, right) => {
    const weekDayComparison = weekDayOrder[left.weekDay] - weekDayOrder[right.weekDay];

    if (weekDayComparison !== 0) {
      return weekDayComparison;
    }

    const startTimeComparison = left.startTimeMinutes - right.startTimeMinutes;

    if (startTimeComparison !== 0) {
      return startTimeComparison;
    }

    return left.endTimeMinutes - right.endTimeMinutes;
  });
}

export async function getAvailabilityById(id: string) {
  const availability = await prisma.availability.findUnique({
    where: {
      id,
    },
    select: availabilitySelect,
  });

  if (!availability) {
    throw availabilityNotFoundError();
  }

  return availability;
}

export async function updateAvailability(id: string, input: UpdateAvailabilityInput) {
  const availability = await prisma.availability.findUnique({
    where: {
      id,
    },
    select: availabilitySelect,
  });

  if (!availability) {
    throw availabilityNotFoundError();
  }

  const nextAvailability = {
    doctorId: input.doctorId ?? availability.doctorId,
    weekDay: input.weekDay ?? availability.weekDay,
    startTimeMinutes: input.startTimeMinutes ?? availability.startTimeMinutes,
    endTimeMinutes: input.endTimeMinutes ?? availability.endTimeMinutes,
    slotDurationMinutes: input.slotDurationMinutes ?? availability.slotDurationMinutes,
  };

  const doctor = await prisma.doctor.findFirst({
    where: {
      id: nextAvailability.doctorId,
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

  const finalStateResult = createAvailabilitySchema.safeParse(nextAvailability);

  if (!finalStateResult.success) {
    throw validationErrorFromZod(finalStateResult.error);
  }

  const overlappingAvailability = await prisma.availability.findFirst({
    where: {
      doctorId: nextAvailability.doctorId,
      weekDay: nextAvailability.weekDay,
      id: {
        not: id,
      },
      startTimeMinutes: {
        lt: nextAvailability.endTimeMinutes,
      },
      endTimeMinutes: {
        gt: nextAvailability.startTimeMinutes,
      },
    },
    select: {
      id: true,
    },
  });

  if (overlappingAvailability) {
    throw availabilityOverlapError();
  }

  const data: {
    doctorId?: string;
    weekDay?: WeekDay;
    startTimeMinutes?: number;
    endTimeMinutes?: number;
    slotDurationMinutes?: number;
  } = {};

  if (input.doctorId !== undefined) {
    data.doctorId = input.doctorId;
  }

  if (input.weekDay !== undefined) {
    data.weekDay = input.weekDay;
  }

  if (input.startTimeMinutes !== undefined) {
    data.startTimeMinutes = input.startTimeMinutes;
  }

  if (input.endTimeMinutes !== undefined) {
    data.endTimeMinutes = input.endTimeMinutes;
  }

  if (input.slotDurationMinutes !== undefined) {
    data.slotDurationMinutes = input.slotDurationMinutes;
  }

  return prisma.availability.update({
    where: {
      id,
    },
    data,
    select: availabilitySelect,
  });
}

export async function deleteAvailability(id: string) {
  await getAvailabilityById(id);

  return prisma.availability.delete({
    where: {
      id,
    },
    select: availabilitySelect,
  });
}
