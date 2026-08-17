import "./test-env.js";

import { randomUUID } from "node:crypto";

export function createTestPrefix(suite: string): string {
  return `test-${suite}-${Date.now()}-${randomUUID()}`;
}

export async function getPrisma() {
  const { prisma } = await import("../../src/config/prisma.js");

  return prisma;
}

export async function cleanupFixtures(prefix: string): Promise<void> {
  const prisma = await getPrisma();
  const users = await prisma.user.findMany({
    where: {
      email: {
        startsWith: prefix,
      },
    },
    select: {
      id: true,
    },
  });
  const specialties = await prisma.specialty.findMany({
    where: {
      name: {
        startsWith: prefix,
      },
    },
    select: {
      id: true,
    },
  });
  const userIds = users.map((user) => user.id);
  const specialtyIds = specialties.map((specialty) => specialty.id);
  const doctors = await prisma.doctor.findMany({
    where: {
      OR: [
        {
          userId: {
            in: userIds,
          },
        },
        {
          specialtyId: {
            in: specialtyIds,
          },
        },
        {
          professionalLicense: {
            startsWith: prefix,
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });
  const patients = await prisma.patient.findMany({
    where: {
      userId: {
        in: userIds,
      },
    },
    select: {
      id: true,
    },
  });
  const doctorIds = doctors.map((doctor) => doctor.id);
  const patientIds = patients.map((patient) => patient.id);

  await prisma.appointment.deleteMany({
    where: {
      OR: [
        {
          doctorId: {
            in: doctorIds,
          },
        },
        {
          patientId: {
            in: patientIds,
          },
        },
      ],
    },
  });
  await prisma.availability.deleteMany({
    where: {
      doctorId: {
        in: doctorIds,
      },
    },
  });
  await prisma.doctor.deleteMany({
    where: {
      id: {
        in: doctorIds,
      },
    },
  });
  await prisma.patient.deleteMany({
    where: {
      id: {
        in: patientIds,
      },
    },
  });
  await prisma.specialty.deleteMany({
    where: {
      id: {
        in: specialtyIds,
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: userIds,
      },
    },
  });
}

export async function countFixtures(prefix: string) {
  const prisma = await getPrisma();
  const users = await prisma.user.findMany({
    where: {
      email: {
        startsWith: prefix,
      },
    },
    select: {
      id: true,
    },
  });
  const specialties = await prisma.specialty.findMany({
    where: {
      name: {
        startsWith: prefix,
      },
    },
    select: {
      id: true,
    },
  });
  const userIds = users.map((user) => user.id);
  const specialtyIds = specialties.map((specialty) => specialty.id);
  const doctors = await prisma.doctor.findMany({
    where: {
      OR: [
        {
          userId: {
            in: userIds,
          },
        },
        {
          specialtyId: {
            in: specialtyIds,
          },
        },
        {
          professionalLicense: {
            startsWith: prefix,
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });
  const patients = await prisma.patient.findMany({
    where: {
      userId: {
        in: userIds,
      },
    },
    select: {
      id: true,
    },
  });
  const doctorIds = doctors.map((doctor) => doctor.id);
  const patientIds = patients.map((patient) => patient.id);
  const [appointments, availabilities] = await Promise.all([
    prisma.appointment.count({
      where: {
        OR: [
          {
            doctorId: {
              in: doctorIds,
            },
          },
          {
            patientId: {
              in: patientIds,
            },
          },
        ],
      },
    }),
    prisma.availability.count({
      where: {
        doctorId: {
          in: doctorIds,
        },
      },
    }),
  ]);

  return {
    appointments,
    availabilities,
    doctors: doctors.length,
    patients: patients.length,
    specialties: specialties.length,
    users: users.length,
  };
}

export async function disconnectPrisma(): Promise<void> {
  const prisma = await getPrisma();

  await prisma.$disconnect();
}
