import bcrypt from "bcrypt";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import { AppointmentStatus, Prisma, UserRole } from "../generated/prisma/client.js";
import type {
  GetAppointmentsQuery,
  UpdateDoctorAppointmentStatusInput,
} from "../schemas/appointment.schema.js";
import type {
  CreateDoctorInput,
  UpdateDoctorInput,
} from "../schemas/doctor.schema.js";

const PASSWORD_SALT_ROUNDS = 12;

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

const doctorAppointmentSelect = {
  id: true,
  scheduledAt: true,
  reason: true,
  status: true,
  createdAt: true,
  patient: {
    select: {
      id: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
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
    details: null,
  });
}

function emailAlreadyRegisteredError(): AppError {
  return new AppError({
    statusCode: 409,
    code: "EMAIL_ALREADY_REGISTERED",
    message: "An account with this email already exists",
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProfessionalLicenseUniqueConstraintError(error: unknown): boolean {
  if (!isRecord(error) || error.code !== "P2002") {
    return false;
  }

  const target = isRecord(error.meta) ? error.meta.target : undefined;

  if (Array.isArray(target) && target.includes("professionalLicense")) {
    return true;
  }

  if (typeof target === "string" && target.includes("professionalLicense")) {
    return true;
  }

  return typeof error.message === "string" && error.message.includes("professionalLicense");
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

function doctorNotFoundError(): AppError {
  return new AppError({
    statusCode: 404,
    code: "DOCTOR_NOT_FOUND",
    message: "Doctor not found",
    details: null,
  });
}

function doctorProfileNotFoundError(): AppError {
  return new AppError({
    statusCode: 409,
    code: "DOCTOR_PROFILE_NOT_FOUND",
    message: "Doctor profile not found for authenticated user",
    details: null,
  });
}

function appointmentNotFoundError(): AppError {
  return new AppError({
    statusCode: 404,
    code: "APPOINTMENT_NOT_FOUND",
    message: "Appointment not found",
    details: null,
  });
}

function appointmentStatusTransitionNotAllowedError(): AppError {
  return new AppError({
    statusCode: 409,
    code: "APPOINTMENT_STATUS_TRANSITION_NOT_ALLOWED",
    message: "Appointment status transition is not allowed",
    details: null,
  });
}

function isDoctorAppointmentStatusTransitionAllowed(
  currentStatus: AppointmentStatus,
  targetStatus: UpdateDoctorAppointmentStatusInput["status"],
): boolean {
  return (
    (currentStatus === AppointmentStatus.PENDING && targetStatus === AppointmentStatus.CONFIRMED) ||
    (currentStatus === AppointmentStatus.CONFIRMED && targetStatus === AppointmentStatus.COMPLETED) ||
    (currentStatus === AppointmentStatus.CONFIRMED && targetStatus === AppointmentStatus.NO_SHOW)
  );
}

function assertDoctorAppointmentTemporalRule(
  scheduledAt: Date,
  targetStatus: UpdateDoctorAppointmentStatusInput["status"],
): void {
  const isFutureAppointment = scheduledAt.getTime() > Date.now();

  if (targetStatus === AppointmentStatus.CONFIRMED && !isFutureAppointment) {
    throw appointmentStatusTransitionNotAllowedError();
  }

  if (
    (targetStatus === AppointmentStatus.COMPLETED || targetStatus === AppointmentStatus.NO_SHOW) &&
    isFutureAppointment
  ) {
    throw appointmentStatusTransitionNotAllowedError();
  }
}

function formatDoctor(doctor: {
  id: string;
  userId: string;
  professionalLicense: string;
  isActive: boolean;
  user: {
    firstName: string;
    lastName: string;
  };
  specialty: {
    id: string;
    name: string;
  };
}) {
  return {
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
  };
}

function formatCreatedDoctor(doctor: {
  id: string;
  professionalLicense: string;
  isActive: boolean;
  user: {
    firstName: string;
    lastName: string;
  };
  specialty: {
    id: string;
    name: string;
  };
}) {
  return {
    id: doctor.id,
    firstName: doctor.user.firstName,
    lastName: doctor.user.lastName,
    specialty: {
      id: doctor.specialty.id,
      name: doctor.specialty.name,
    },
    professionalLicense: doctor.professionalLicense,
    isActive: doctor.isActive,
  };
}

async function getAuthenticatedDoctor(authenticatedUserId: string) {
  const doctor = await prisma.doctor.findFirst({
    where: {
      userId: authenticatedUserId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!doctor) {
    throw doctorProfileNotFoundError();
  }

  return doctor;
}

function formatDoctorAppointment(appointment: {
  id: string;
  scheduledAt: Date;
  reason: string | null;
  status: AppointmentStatus;
  createdAt: Date;
  patient: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
}) {
  return {
    id: appointment.id,
    scheduledAt: appointment.scheduledAt,
    reason: appointment.reason,
    status: appointment.status,
    createdAt: appointment.createdAt,
    patient: {
      id: appointment.patient.id,
      firstName: appointment.patient.user.firstName,
      lastName: appointment.patient.user.lastName,
    },
  };
}

export async function createDoctor(input: CreateDoctorInput) {
  const specialty = await prisma.specialty.findFirst({
    where: {
      id: input.specialtyId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!specialty) {
    throw specialtyNotFoundError();
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
    throw emailAlreadyRegisteredError();
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

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  try {
    const doctor = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          passwordHash,
          role: UserRole.DOCTOR,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      return tx.doctor.create({
        data: {
          userId: user.id,
          specialtyId: input.specialtyId,
          professionalLicense: input.professionalLicense,
          isActive: true,
        },
        select: doctorListSelect,
      });
    });

    return formatCreatedDoctor(doctor);
  } catch (error) {
    if (isEmailUniqueConstraintError(error)) {
      throw emailAlreadyRegisteredError();
    }

    if (isProfessionalLicenseUniqueConstraintError(error)) {
      throw doctorLicenseAlreadyExistsError();
    }

    throw error;
  }
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

  return doctors.map(formatDoctor);
}

export async function getDoctorById(id: string) {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id,
      isActive: true,
      user: {
        isActive: true,
      },
      specialty: {
        isActive: true,
      },
    },
    select: doctorListSelect,
  });

  if (!doctor) {
    throw doctorNotFoundError();
  }

  return formatDoctor(doctor);
}

export async function getAuthenticatedDoctorAppointments(
  authenticatedUserId: string,
  filters: GetAppointmentsQuery,
) {
  const doctor = await getAuthenticatedDoctor(authenticatedUserId);
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
      doctorId: doctor.id,
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
    select: doctorAppointmentSelect,
  });

  return appointments.map(formatDoctorAppointment);
}

export async function getAuthenticatedDoctorAppointmentById(
  authenticatedUserId: string,
  appointmentId: string,
) {
  const doctor = await getAuthenticatedDoctor(authenticatedUserId);

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      doctorId: doctor.id,
    },
    select: doctorAppointmentSelect,
  });

  if (!appointment) {
    throw appointmentNotFoundError();
  }

  return formatDoctorAppointment(appointment);
}

export async function updateAuthenticatedDoctorAppointmentStatus(
  authenticatedUserId: string,
  appointmentId: string,
  targetStatus: UpdateDoctorAppointmentStatusInput["status"],
) {
  const doctor = await getAuthenticatedDoctor(authenticatedUserId);

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      doctorId: doctor.id,
    },
    select: doctorAppointmentSelect,
  });

  if (!appointment) {
    throw appointmentNotFoundError();
  }

  if (appointment.status === targetStatus) {
    return formatDoctorAppointment(appointment);
  }

  if (!isDoctorAppointmentStatusTransitionAllowed(appointment.status, targetStatus)) {
    throw appointmentStatusTransitionNotAllowedError();
  }

  assertDoctorAppointmentTemporalRule(appointment.scheduledAt, targetStatus);

  const updatedAppointment = await prisma.appointment.update({
    where: {
      id: appointment.id,
    },
    data: {
      status: targetStatus,
    },
    select: doctorAppointmentSelect,
  });

  return formatDoctorAppointment(updatedAppointment);
}

export async function updateDoctor(id: string, input: UpdateDoctorInput) {
  const doctor = await prisma.doctor.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      professionalLicense: true,
    },
  });

  if (!doctor) {
    throw doctorNotFoundError();
  }

  if (
    input.professionalLicense !== undefined &&
    input.professionalLicense !== doctor.professionalLicense
  ) {
    const existingDoctorWithLicense = await prisma.doctor.findFirst({
      where: {
        professionalLicense: input.professionalLicense,
        id: {
          not: id,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingDoctorWithLicense) {
      throw doctorLicenseAlreadyExistsError();
    }
  }

  if (input.specialtyId !== undefined) {
    const specialty = await prisma.specialty.findFirst({
      where: {
        id: input.specialtyId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!specialty) {
      throw specialtyNotFoundError();
    }
  }

  const data: {
    specialtyId?: string;
    professionalLicense?: string;
    isActive?: boolean;
  } = {};

  if (input.specialtyId !== undefined) {
    data.specialtyId = input.specialtyId;
  }

  if (input.professionalLicense !== undefined) {
    data.professionalLicense = input.professionalLicense;
  }

  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }

  try {
    const updatedDoctor = await prisma.doctor.update({
      where: {
        id,
      },
      data,
      select: doctorListSelect,
    });

    return formatDoctor(updatedDoctor);
  } catch (error) {
    if (isProfessionalLicenseUniqueConstraintError(error)) {
      throw doctorLicenseAlreadyExistsError();
    }

    throw error;
  }
}

export async function deleteDoctor(id: string) {
  const doctor = await prisma.doctor.findUnique({
    where: {
      id,
    },
    select: doctorListSelect,
  });

  if (!doctor) {
    throw doctorNotFoundError();
  }

  if (!doctor.isActive) {
    return formatDoctor(doctor);
  }

  const deletedDoctor = await prisma.doctor.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
    select: doctorListSelect,
  });

  return formatDoctor(deletedDoctor);
}
