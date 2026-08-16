import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import { AppointmentStatus, Prisma, WeekDay } from "../generated/prisma/client.js";
import type {
  CreateAppointmentInput,
  GetAppointmentsQuery,
} from "../schemas/appointment.schema.js";

const APPOINTMENT_TIME_ZONE = "America/Argentina/Cordoba";
const ACTIVE_APPOINTMENT_STATUSES = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] as const;
const ACTIVE_APPOINTMENT_UNIQUE_INDEXES = [
  "Appointment_doctorId_scheduledAt_active_key",
  "Appointment_patientId_scheduledAt_active_key",
] as const;

const appointmentSelect = {
  id: true,
  patientId: true,
  doctorId: true,
  scheduledAt: true,
  reason: true,
  status: true,
  createdAt: true,
} as const;

const appointmentListSelect = {
  id: true,
  scheduledAt: true,
  reason: true,
  status: true,
  createdAt: true,
  doctor: {
    select: {
      id: true,
      professionalLicense: true,
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
    },
  },
} as const;

const weekDayByName: Record<string, WeekDay> = {
  Monday: WeekDay.MONDAY,
  Tuesday: WeekDay.TUESDAY,
  Wednesday: WeekDay.WEDNESDAY,
  Thursday: WeekDay.THURSDAY,
  Friday: WeekDay.FRIDAY,
  Saturday: WeekDay.SATURDAY,
  Sunday: WeekDay.SUNDAY,
};

const appointmentDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APPOINTMENT_TIME_ZONE,
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function patientProfileNotFoundError(): AppError {
  return new AppError({
    statusCode: 409,
    code: "PATIENT_PROFILE_NOT_FOUND",
    message: "Patient profile not found for authenticated user",
    details: null,
  });
}

async function getAuthenticatedPatient(authenticatedUserId: string) {
  const patient = await prisma.patient.findFirst({
    where: {
      userId: authenticatedUserId,
      user: {
        isActive: true,
      },
    },
    select: {
      id: true,
    },
  });

  if (!patient) {
    throw patientProfileNotFoundError();
  }

  return patient;
}

function formatAppointmentPublicItem(appointment: {
  id: string;
  scheduledAt: Date;
  reason: string | null;
  status: AppointmentStatus;
  createdAt: Date;
  doctor: {
    id: string;
    professionalLicense: string;
    user: {
      firstName: string;
      lastName: string;
    };
    specialty: {
      id: string;
      name: string;
    };
  };
}) {
  return {
    id: appointment.id,
    scheduledAt: appointment.scheduledAt,
    reason: appointment.reason,
    status: appointment.status,
    doctor: {
      id: appointment.doctor.id,
      firstName: appointment.doctor.user.firstName,
      lastName: appointment.doctor.user.lastName,
      professionalLicense: appointment.doctor.professionalLicense,
      specialty: {
        id: appointment.doctor.specialty.id,
        name: appointment.doctor.specialty.name,
      },
    },
    createdAt: appointment.createdAt,
  };
}

function appointmentNotFoundError(): AppError {
  return new AppError({
    statusCode: 404,
    code: "APPOINTMENT_NOT_FOUND",
    message: "Appointment not found",
    details: null,
  });
}

function doctorNotFoundError(): AppError {
  return new AppError({
    statusCode: 404,
    code: "DOCTOR_NOT_FOUND",
    message: "Doctor not found",
    details: null,
  });
}

function appointmentInPastError(): AppError {
  return new AppError({
    statusCode: 400,
    code: "APPOINTMENT_IN_PAST",
    message: "Appointment cannot be scheduled in the past",
    details: null,
  });
}

function appointmentSlotUnavailableError(): AppError {
  return new AppError({
    statusCode: 409,
    code: "APPOINTMENT_SLOT_UNAVAILABLE",
    message: "Appointment slot is unavailable",
    details: null,
  });
}

function getAppointmentLocalTime(scheduledAt: Date): {
  weekDay: WeekDay;
  minuteOfDay: number;
  second: number;
} {
  const parts = appointmentDateTimeFormatter.formatToParts(scheduledAt);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));
  const weekDayName = valueByType.get("weekday");
  const hourValue = valueByType.get("hour");
  const minuteValue = valueByType.get("minute");
  const secondValue = valueByType.get("second");

  if (!weekDayName || !hourValue || !minuteValue || !secondValue) {
    throw appointmentSlotUnavailableError();
  }

  const weekDay = weekDayByName[weekDayName];

  if (!weekDay) {
    throw appointmentSlotUnavailableError();
  }

  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);

  return {
    weekDay,
    minuteOfDay: hour * 60 + minute,
    second,
  };
}

function isAppointmentUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return (
      (target.includes("doctorId") || target.includes("patientId")) &&
      target.includes("scheduledAt")
    );
  }

  if (typeof target === "string") {
    return ACTIVE_APPOINTMENT_UNIQUE_INDEXES.some((indexName) => target.includes(indexName));
  }

  return ACTIVE_APPOINTMENT_UNIQUE_INDEXES.some((indexName) => error.message.includes(indexName));
}

export async function createAppointment(input: CreateAppointmentInput, authenticatedUserId: string) {
  const scheduledAt = new Date(input.scheduledAt);

  if (scheduledAt.getTime() <= Date.now()) {
    throw appointmentInPastError();
  }

  const patient = await getAuthenticatedPatient(authenticatedUserId);

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

  const appointmentLocalTime = getAppointmentLocalTime(scheduledAt);
  const availabilities = await prisma.availability.findMany({
    where: {
      doctorId: input.doctorId,
      weekDay: appointmentLocalTime.weekDay,
    },
    select: {
      startTimeMinutes: true,
      endTimeMinutes: true,
      slotDurationMinutes: true,
    },
  });

  const fitsAvailability = availabilities.some((availability) => {
    const slotEndMinute = appointmentLocalTime.minuteOfDay + availability.slotDurationMinutes;

    return (
      appointmentLocalTime.second === 0 &&
      scheduledAt.getUTCMilliseconds() === 0 &&
      availability.startTimeMinutes <= appointmentLocalTime.minuteOfDay &&
      slotEndMinute <= availability.endTimeMinutes &&
      (appointmentLocalTime.minuteOfDay - availability.startTimeMinutes) % availability.slotDurationMinutes === 0
    );
  });

  if (!fitsAvailability) {
    throw appointmentSlotUnavailableError();
  }

  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      OR: [
        {
          doctorId: input.doctorId,
        },
        {
          patientId: patient.id,
        },
      ],
      scheduledAt,
      status: {
        in: [...ACTIVE_APPOINTMENT_STATUSES],
      },
    },
    select: {
      id: true,
    },
  });

  if (existingAppointment) {
    throw appointmentSlotUnavailableError();
  }

  const data: {
    patientId: string;
    doctorId: string;
    scheduledAt: Date;
    reason?: string;
  } = {
    patientId: patient.id,
    doctorId: input.doctorId,
    scheduledAt,
  };

  if (input.reason !== undefined) {
    data.reason = input.reason;
  }

  try {
    return await prisma.appointment.create({
      data,
      select: appointmentSelect,
    });
  } catch (error) {
    if (isAppointmentUniqueConstraintError(error)) {
      throw appointmentSlotUnavailableError();
    }

    throw error;
  }
}

export async function getPatientAppointments(
  authenticatedUserId: string,
  filters: GetAppointmentsQuery,
) {
  const patient = await getAuthenticatedPatient(authenticatedUserId);

  const scheduledAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};

  if (filters.from !== undefined) {
    scheduledAtFilter.gte = new Date(filters.from);
  }

  if (filters.to !== undefined) {
    scheduledAtFilter.lte = new Date(filters.to);
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      patientId: patient.id,
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(Object.keys(scheduledAtFilter).length === 0 ? {} : { scheduledAt: scheduledAtFilter }),
    },
    orderBy: [
      {
        scheduledAt: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: appointmentListSelect,
  });

  return appointments.map(formatAppointmentPublicItem);
}

export async function getPatientAppointmentById(
  authenticatedUserId: string,
  appointmentId: string,
) {
  const patient = await getAuthenticatedPatient(authenticatedUserId);

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      patientId: patient.id,
    },
    select: appointmentListSelect,
  });

  if (!appointment) {
    throw appointmentNotFoundError();
  }

  return formatAppointmentPublicItem(appointment);
}
