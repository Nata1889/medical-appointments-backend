import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { UserRole } from "../../src/generated/prisma/client.js";
import { signTestToken } from "../helpers/test-auth.js";
import { cleanupFixtures, countFixtures, createTestPrefix, disconnectPrisma, getPrisma } from "../helpers/test-db.js";
import { startTestServer, stopTestServer, type TestServer } from "../helpers/test-server.js";
import { getDataObject, getErrorCode, requestJson } from "../helpers/http.js";
import { createPatientUser } from "../helpers/fixtures.js";

describe("auth integration", () => {
  const prefix = createTestPrefix("auth");
  const password = "Password1";
  let server: TestServer;

  beforeAll(async () => {
    await cleanupFixtures(prefix);
    server = await startTestServer();
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

  test("registers a patient user and creates a patient profile", async () => {
    const response = await requestJson(`${server.baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        firstName: "Alice",
        lastName: "Patient",
        email: `${prefix}-register@example.com`,
        password,
      }),
    });

    expect(response.response.status).toBe(201);
    const data = getDataObject(response.body);
    expect(data.role).toBe(UserRole.PATIENT);

    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({
      where: {
        email: `${prefix}-register@example.com`,
      },
      include: {
        patient: true,
      },
    });

    expect(user).not.toBeNull();
    expect(user?.role).toBe(UserRole.PATIENT);
    expect(user?.patient).not.toBeNull();
    expect(user?.patient?.userId).toBe(user?.id);
  });

  test("logs in and returns an access token", async () => {
    const response = await requestJson(`${server.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: `${prefix}-register@example.com`,
        password,
      }),
    });

    expect(response.response.status).toBe(200);
    const data = getDataObject(response.body);
    expect(typeof data.accessToken).toBe("string");
    expect(data.accessToken).not.toBe("");
  });

  test("returns the current user for a valid token", async () => {
    const loginResponse = await requestJson(`${server.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: `${prefix}-register@example.com`,
        password,
      }),
    });
    const loginData = getDataObject(loginResponse.body);
    const accessToken = String(loginData.accessToken);
    const response = await requestJson(`${server.baseUrl}/auth/me`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.response.status).toBe(200);
    expect(getDataObject(response.body).email).toBe(`${prefix}-register@example.com`);
  });

  test("rejects duplicate registration", async () => {
    const response = await requestJson(`${server.baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        firstName: "Alice",
        lastName: "Patient",
        email: `${prefix}-register@example.com`,
        password,
      }),
    });

    expect(response.response.status).toBe(409);
    expect(getErrorCode(response.body)).toBe("EMAIL_ALREADY_REGISTERED");
  });

  test("requires authorization for /auth/me", async () => {
    const response = await requestJson(`${server.baseUrl}/auth/me`);

    expect(response.response.status).toBe(401);
    expect(getErrorCode(response.body)).toBe("UNAUTHORIZED");
  });

  test("rejects an invalid JWT", async () => {
    const response = await requestJson(`${server.baseUrl}/auth/me`, {
      headers: {
        authorization: "Bearer invalid-token",
      },
    });

    expect(response.response.status).toBe(401);
    expect(getErrorCode(response.body)).toBe("UNAUTHORIZED");
  });

  test("rejects a token after the user is deactivated", async () => {
    const prisma = await getPrisma();
    const user = await createPatientUser(prefix, "deactivated", UserRole.PATIENT);
    const token = await signTestToken({ id: user.id, role: UserRole.PATIENT });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        isActive: false,
      },
    });

    const response = await requestJson(`${server.baseUrl}/auth/me`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.response.status).toBe(401);
    expect(getErrorCode(response.body)).toBe("UNAUTHORIZED");
  });

  test("rejects a token after the user's role changes in the database", async () => {
    const prisma = await getPrisma();
    const user = await createPatientUser(prefix, "role-changed", UserRole.PATIENT);
    const token = await signTestToken({ id: user.id, role: UserRole.PATIENT });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        role: UserRole.ADMIN,
      },
    });

    const response = await requestJson(`${server.baseUrl}/auth/me`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.response.status).toBe(401);
    expect(getErrorCode(response.body)).toBe("UNAUTHORIZED");
  });
});
