import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { AppointmentStatus, UserRole } from "../../src/generated/prisma/client.js";
import { createAppointment, createAvailability, createDoctorProfile, createPatientUser, createSpecialty, createUser } from "../helpers/fixtures.js";
import { getDataArray, getDataObject, getErrorCode, requestJson } from "../helpers/http.js";
import { signTestToken } from "../helpers/test-auth.js";
import { cleanupFixtures, countFixtures, createTestPrefix, disconnectPrisma } from "../helpers/test-db.js";
import { startTestServer, stopTestServer, type TestServer } from "../helpers/test-server.js";
import { futureLocalDate, localMinuteLabel } from "../helpers/time.js";

function slotTimes(body: unknown): string[] {
  return getDataArray(body).map((item) => {
    expect(Object.keys(item)).toEqual(["scheduledAt"]);
    expect(typeof item.scheduledAt).toBe("string");
    return localMinuteLabel(new Date(String(item.scheduledAt)));
  });
}

describe("doctor slots integration", () => {
  const prefix = createTestPrefix("doctor-slots");
  let server: TestServer;
  let patientToken: string;
  let bookingPatientToken: string;
  let adminToken: string;
  let doctorToken: string;
  let patientId: string;
  let targetDoctorId: string;
  let cleanDoctorId: string;
  let inactiveDoctorId: string;
  let inactiveSpecialtyDoctorId: string;
  let slotsDate: string;
  let localDateTimeToAppointmentDate: (date: string, minuteOfDay: number) => Date;

  beforeAll(async () => {
    await cleanupFixtures(prefix);
    server = await startTestServer();
    const time = await import("../../src/utils/appointment-time.js");
    localDateTimeToAppointmentDate = time.localDateTimeToAppointmentDate;
    slotsDate = await futureLocalDate(21);
    const weekDay = time.getAppointmentLocalTime(localDateTimeToAppointmentDate(slotsDate, 0))?.weekDay;

    if (!weekDay) {
      throw new Error("Could not determine slots weekday");
    }

    const patientUser = await createPatientUser(prefix, "patient", UserRole.PATIENT);
    const bookingPatientUser = await createPatientUser(prefix, "booking-patient", UserRole.PATIENT);

    if (!patientUser.patient || !bookingPatientUser.patient) {
      throw new Error("Patient fixture was not created");
    }

    patientId = patientUser.patient.id;
    const adminUser = await createUser(prefix, "admin", UserRole.ADMIN);
    const doctorAuthUser = await createUser(prefix, "doctor-auth", UserRole.DOCTOR);
    patientToken = await signTestToken({ id: patientUser.id, role: UserRole.PATIENT });
    bookingPatientToken = await signTestToken({ id: bookingPatientUser.id, role: UserRole.PATIENT });
    adminToken = await signTestToken({ id: adminUser.id, role: UserRole.ADMIN });
    doctorToken = await signTestToken({ id: doctorAuthUser.id, role: UserRole.DOCTOR });

    const specialty = await createSpecialty(prefix, "active-specialty");
    const inactiveSpecialty = await createSpecialty(prefix, "inactive-specialty", false);
    const targetDoctorUser = await createUser(prefix, "target-doctor", UserRole.DOCTOR);
    const cleanDoctorUser = await createUser(prefix, "clean-doctor", UserRole.DOCTOR);
    const inactiveDoctorUser = await createUser(prefix, "inactive-doctor", UserRole.DOCTOR);
    const inactiveSpecialtyDoctorUser = await createUser(prefix, "inactive-specialty-doctor", UserRole.DOCTOR);
    const targetDoctor = await createDoctorProfile({
      prefix,
      label: "target-doctor",
      userId: targetDoctorUser.id,
      specialtyId: specialty.id,
    });
    const cleanDoctor = await createDoctorProfile({
      prefix,
      label: "clean-doctor",
      userId: cleanDoctorUser.id,
      specialtyId: specialty.id,
    });
    const inactiveDoctor = await createDoctorProfile({
      prefix,
      label: "inactive-doctor",
      userId: inactiveDoctorUser.id,
      specialtyId: specialty.id,
      isActive: false,
    });
    const inactiveSpecialtyDoctor = await createDoctorProfile({
      prefix,
      label: "inactive-specialty-doctor",
      userId: inactiveSpecialtyDoctorUser.id,
      specialtyId: inactiveSpecialty.id,
    });
    targetDoctorId = targetDoctor.id;
    cleanDoctorId = cleanDoctor.id;
    inactiveDoctorId = inactiveDoctor.id;
    inactiveSpecialtyDoctorId = inactiveSpecialtyDoctor.id;

    await createAvailability({
      doctorId: cleanDoctorId,
      weekDay,
      startTimeMinutes: 9 * 60,
      endTimeMinutes: 11 * 60,
      slotDurationMinutes: 30,
    });
    await createAvailability({
      doctorId: targetDoctorId,
      weekDay,
      startTimeMinutes: 9 * 60,
      endTimeMinutes: 11 * 60,
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

  test("returns exact clean availability slots for patient and admin", async () => {
    const patientResponse = await requestJson(`${server.baseUrl}/doctors/${cleanDoctorId}/slots?date=${slotsDate}`, {
      headers: {
        authorization: `Bearer ${patientToken}`,
      },
    });

    expect(patientResponse.response.status).toBe(200);
    expect(slotTimes(patientResponse.body)).toEqual(["09:00", "09:30", "10:00", "10:30"]);

    const adminResponse = await requestJson(`${server.baseUrl}/doctors/${cleanDoctorId}/slots?date=${slotsDate}`, {
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(adminResponse.response.status).toBe(200);
    expect(slotTimes(adminResponse.body)).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  test("rejects doctor role and missing authorization", async () => {
    const doctorResponse = await requestJson(`${server.baseUrl}/doctors/${cleanDoctorId}/slots?date=${slotsDate}`, {
      headers: {
        authorization: `Bearer ${doctorToken}`,
      },
    });

    expect(doctorResponse.response.status).toBe(403);
    expect(getErrorCode(doctorResponse.body)).toBe("FORBIDDEN");

    const missingAuthResponse = await requestJson(`${server.baseUrl}/doctors/${cleanDoctorId}/slots?date=${slotsDate}`);

    expect(missingAuthResponse.response.status).toBe(401);
    expect(getErrorCode(missingAuthResponse.body)).toBe("UNAUTHORIZED");
  });

  test("blocks only pending and confirmed appointments", async () => {
    await createAppointment({
      patientId,
      doctorId: targetDoctorId,
      scheduledAt: localDateTimeToAppointmentDate(slotsDate, 9 * 60),
      status: AppointmentStatus.PENDING,
    });
    await createAppointment({
      patientId,
      doctorId: targetDoctorId,
      scheduledAt: localDateTimeToAppointmentDate(slotsDate, 9 * 60 + 30),
      status: AppointmentStatus.CONFIRMED,
    });
    await createAppointment({
      patientId,
      doctorId: targetDoctorId,
      scheduledAt: localDateTimeToAppointmentDate(slotsDate, 10 * 60),
      status: AppointmentStatus.CANCELLED,
    });

    const response = await requestJson(`${server.baseUrl}/doctors/${targetDoctorId}/slots?date=${slotsDate}`, {
      headers: {
        authorization: `Bearer ${patientToken}`,
      },
    });

    expect(response.response.status).toBe(200);
    expect(slotTimes(response.body)).toEqual(["10:00", "10:30"]);
  });

  test("returns empty slots for a past date", async () => {
    const { addDaysToLocalDate, getAppointmentLocalDateString } = await import("../../src/utils/appointment-time.js");
    const today = getAppointmentLocalDateString(new Date());

    expect(today).not.toBeNull();
    const response = await requestJson(`${server.baseUrl}/doctors/${cleanDoctorId}/slots?date=${addDaysToLocalDate(String(today), -1)}`, {
      headers: {
        authorization: `Bearer ${patientToken}`,
      },
    });

    expect(response.response.status).toBe(200);
    expect(getDataArray(response.body)).toEqual([]);
  });

  test("returns not found for inactive doctor or inactive specialty", async () => {
    const inactiveDoctorResponse = await requestJson(`${server.baseUrl}/doctors/${inactiveDoctorId}/slots?date=${slotsDate}`, {
      headers: {
        authorization: `Bearer ${patientToken}`,
      },
    });

    expect(inactiveDoctorResponse.response.status).toBe(404);
    expect(getErrorCode(inactiveDoctorResponse.body)).toBe("DOCTOR_NOT_FOUND");

    const inactiveSpecialtyResponse = await requestJson(`${server.baseUrl}/doctors/${inactiveSpecialtyDoctorId}/slots?date=${slotsDate}`, {
      headers: {
        authorization: `Bearer ${patientToken}`,
      },
    });

    expect(inactiveSpecialtyResponse.response.status).toBe(404);
    expect(getErrorCode(inactiveSpecialtyResponse.body)).toBe("DOCTOR_NOT_FOUND");
  });

  test("removes a booked slot and releases it after cancellation", async () => {
    const beforeResponse = await requestJson(`${server.baseUrl}/doctors/${cleanDoctorId}/slots?date=${slotsDate}`, {
      headers: {
        authorization: `Bearer ${patientToken}`,
      },
    });
    const slot = getDataArray(beforeResponse.body)[0]?.scheduledAt;

    expect(typeof slot).toBe("string");

    const createResponse = await requestJson(`${server.baseUrl}/appointments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${bookingPatientToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ doctorId: cleanDoctorId, scheduledAt: slot }),
    });

    expect(createResponse.response.status).toBe(201);
    const appointment = getDataObject(createResponse.body);

    const afterCreateResponse = await requestJson(`${server.baseUrl}/doctors/${cleanDoctorId}/slots?date=${slotsDate}`, {
      headers: {
        authorization: `Bearer ${patientToken}`,
      },
    });

    expect(getDataArray(afterCreateResponse.body).map((item) => item.scheduledAt)).not.toContain(slot);

    const cancelResponse = await requestJson(`${server.baseUrl}/appointments/${String(appointment.id)}/cancel`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${bookingPatientToken}`,
      },
    });

    expect(cancelResponse.response.status).toBe(200);
    expect(getDataObject(cancelResponse.body).status).toBe(AppointmentStatus.CANCELLED);

    const afterCancelResponse = await requestJson(`${server.baseUrl}/doctors/${cleanDoctorId}/slots?date=${slotsDate}`, {
      headers: {
        authorization: `Bearer ${patientToken}`,
      },
    });

    expect(getDataArray(afterCancelResponse.body).map((item) => item.scheduledAt)).toContain(slot);
  });
});
