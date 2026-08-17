import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { AppointmentStatus, UserRole } from "../../src/generated/prisma/client.js";
import { createAppointment, createAvailability, createDoctorProfile, createPatientUser, createSpecialty, createUser } from "../helpers/fixtures.js";
import { getDataArray, getDataObject, getErrorCode, requestJson } from "../helpers/http.js";
import { signTestToken } from "../helpers/test-auth.js";
import { cleanupFixtures, countFixtures, createTestPrefix, disconnectPrisma } from "../helpers/test-db.js";
import { startTestServer, stopTestServer, type TestServer } from "../helpers/test-server.js";
import { futureLocalDate } from "../helpers/time.js";

describe("appointments integration", () => {
  const prefix = createTestPrefix("appointments");
  let server: TestServer;
  let patientA: Awaited<ReturnType<typeof createPatientUser>>;
  let patientB: Awaited<ReturnType<typeof createPatientUser>>;
  let patientAToken: string;
  let patientBToken: string;
  let patientAId: string;
  let doctorId: string;
  let otherDoctorId: string;
  let appointmentDate: string;
  let localDateTimeToAppointmentDate: (date: string, minuteOfDay: number) => Date;

  beforeAll(async () => {
    await cleanupFixtures(prefix);
    server = await startTestServer();
    const time = await import("../../src/utils/appointment-time.js");
    localDateTimeToAppointmentDate = time.localDateTimeToAppointmentDate;
    appointmentDate = await futureLocalDate(14);
    const weekDay = time.getAppointmentLocalTime(localDateTimeToAppointmentDate(appointmentDate, 0))?.weekDay;

    if (!weekDay) {
      throw new Error("Could not determine appointment weekday");
    }

    patientA = await createPatientUser(prefix, "patient-a", UserRole.PATIENT);
    patientB = await createPatientUser(prefix, "patient-b", UserRole.PATIENT);

    if (!patientA.patient || !patientB.patient) {
      throw new Error("Patient fixture was not created");
    }

    patientAId = patientA.patient.id;
    patientAToken = await signTestToken({ id: patientA.id, role: UserRole.PATIENT });
    patientBToken = await signTestToken({ id: patientB.id, role: UserRole.PATIENT });

    const specialty = await createSpecialty(prefix, "appointments-specialty");
    const doctorUser = await createUser(prefix, "doctor", UserRole.DOCTOR);
    const otherDoctorUser = await createUser(prefix, "other-doctor", UserRole.DOCTOR);
    const doctor = await createDoctorProfile({
      prefix,
      label: "doctor",
      userId: doctorUser.id,
      specialtyId: specialty.id,
    });
    const otherDoctor = await createDoctorProfile({
      prefix,
      label: "other-doctor",
      userId: otherDoctorUser.id,
      specialtyId: specialty.id,
    });
    doctorId = doctor.id;
    otherDoctorId = otherDoctor.id;

    await createAvailability({
      doctorId,
      weekDay,
      startTimeMinutes: 9 * 60,
      endTimeMinutes: 12 * 60,
      slotDurationMinutes: 30,
    });
    await createAvailability({
      doctorId: otherDoctorId,
      weekDay,
      startTimeMinutes: 9 * 60,
      endTimeMinutes: 12 * 60,
      slotDurationMinutes: 30,
    });
  });

  afterAll(async () => {
    await stopTestServer(server);
    await cleanupFixtures(prefix);
    await expect(countFixtures(prefix)).resolves.toEqual({
      appointments: 0,
      availabilities: 0,
      doctors: 0,
      patients: 0,
      specialties: 0,
      users: 0,
    });
    await disconnectPrisma();
  });

  test("creates, lists, reads, and idempotently cancels a patient's appointment", async () => {
    const scheduledAt = localDateTimeToAppointmentDate(appointmentDate, 9 * 60).toISOString();
    const createResponse = await requestJson(`${server.baseUrl}/appointments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${patientAToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ doctorId, scheduledAt }),
    });

    expect(createResponse.response.status).toBe(201);
    const appointment = getDataObject(createResponse.body);
    expect(appointment.status).toBe(AppointmentStatus.PENDING);

    const listResponse = await requestJson(`${server.baseUrl}/appointments`, {
      headers: {
        authorization: `Bearer ${patientAToken}`,
      },
    });

    expect(listResponse.response.status).toBe(200);
    expect(getDataArray(listResponse.body).some((item) => item.id === appointment.id)).toBe(true);

    const detailResponse = await requestJson(`${server.baseUrl}/appointments/${String(appointment.id)}`, {
      headers: {
        authorization: `Bearer ${patientAToken}`,
      },
    });

    expect(detailResponse.response.status).toBe(200);
    expect(getDataObject(detailResponse.body).id).toBe(appointment.id);

    const otherPatientResponse = await requestJson(`${server.baseUrl}/appointments/${String(appointment.id)}`, {
      headers: {
        authorization: `Bearer ${patientBToken}`,
      },
    });

    expect(otherPatientResponse.response.status).toBe(404);
    expect(getErrorCode(otherPatientResponse.body)).toBe("APPOINTMENT_NOT_FOUND");

    const cancelResponse = await requestJson(`${server.baseUrl}/appointments/${String(appointment.id)}/cancel`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${patientAToken}`,
      },
    });

    expect(cancelResponse.response.status).toBe(200);
    expect(getDataObject(cancelResponse.body).status).toBe(AppointmentStatus.CANCELLED);

    const secondCancelResponse = await requestJson(`${server.baseUrl}/appointments/${String(appointment.id)}/cancel`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${patientAToken}`,
      },
    });

    expect(secondCancelResponse.response.status).toBe(200);
    expect(getDataObject(secondCancelResponse.body).status).toBe(AppointmentStatus.CANCELLED);
  });

  test("rejects two active appointments for the same doctor at the same time", async () => {
    const scheduledAt = localDateTimeToAppointmentDate(appointmentDate, 9 * 60 + 30);

    await createAppointment({
      patientId: patientAId,
      doctorId,
      scheduledAt,
      status: AppointmentStatus.PENDING,
    });

    const response = await requestJson(`${server.baseUrl}/appointments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${patientBToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ doctorId, scheduledAt: scheduledAt.toISOString() }),
    });

    expect(response.response.status).toBe(409);
    expect(getErrorCode(response.body)).toBe("APPOINTMENT_SLOT_UNAVAILABLE");
  });

  test("rejects two active appointments for the same patient at the same time", async () => {
    const scheduledAt = localDateTimeToAppointmentDate(appointmentDate, 10 * 60);

    await createAppointment({
      patientId: patientAId,
      doctorId,
      scheduledAt,
      status: AppointmentStatus.PENDING,
    });

    const response = await requestJson(`${server.baseUrl}/appointments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${patientAToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ doctorId: otherDoctorId, scheduledAt: scheduledAt.toISOString() }),
    });

    expect(response.response.status).toBe(409);
    expect(getErrorCode(response.body)).toBe("APPOINTMENT_SLOT_UNAVAILABLE");
  });

  test("rejects a slot outside the doctor's availability alignment", async () => {
    const scheduledAt = localDateTimeToAppointmentDate(appointmentDate, 9 * 60 + 15).toISOString();
    const response = await requestJson(`${server.baseUrl}/appointments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${patientAToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ doctorId, scheduledAt }),
    });

    expect(response.response.status).toBe(409);
    expect(getErrorCode(response.body)).toBe("APPOINTMENT_SLOT_UNAVAILABLE");
  });
});
