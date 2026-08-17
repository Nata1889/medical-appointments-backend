import type { AppointmentStatus, UserRole, WeekDay } from "../../src/generated/prisma/client.js";
import { getPrisma } from "./test-db.js";

const passwordHash = "unused";

export async function createUser(prefix: string, label: string, role: UserRole, isActive = true) {
  const prisma = await getPrisma();

  return prisma.user.create({
    data: {
      email: `${prefix}-${label}@example.com`,
      firstName: label,
      lastName: "Test",
      passwordHash,
      role,
      isActive,
    },
  });
}

export async function createPatientUser(prefix: string, label: string, role: UserRole) {
  const prisma = await getPrisma();

  return prisma.user.create({
    data: {
      email: `${prefix}-${label}@example.com`,
      firstName: label,
      lastName: "Test",
      passwordHash,
      role,
      isActive: true,
      patient: {
        create: {},
      },
    },
    include: {
      patient: true,
    },
  });
}

export async function createSpecialty(prefix: string, label: string, isActive = true) {
  const prisma = await getPrisma();

  return prisma.specialty.create({
    data: {
      name: `${prefix}-${label}`,
      isActive,
    },
  });
}

export async function createDoctorProfile(input: {
  prefix: string;
  label: string;
  userId: string;
  specialtyId: string;
  isActive?: boolean;
}) {
  const prisma = await getPrisma();

  return prisma.doctor.create({
    data: {
      userId: input.userId,
      specialtyId: input.specialtyId,
      professionalLicense: `${input.prefix}-${input.label}-license`,
      isActive: input.isActive ?? true,
    },
  });
}

export async function createAvailability(input: {
  doctorId: string;
  weekDay: WeekDay;
  startTimeMinutes: number;
  endTimeMinutes: number;
  slotDurationMinutes: number;
}) {
  const prisma = await getPrisma();

  return prisma.availability.create({ data: input });
}

export async function createAppointment(input: {
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  status: AppointmentStatus;
}) {
  const prisma = await getPrisma();

  return prisma.appointment.create({ data: input });
}
