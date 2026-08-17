# Frontend Integration Guide

This guide shows how a Next.js frontend should consume the current Medical Appointments API without inferring backend contracts from source code.

## API URL

Use an environment variable in the frontend for the API origin.

Development default from the backend `.env.example`:

```text
http://localhost:4000
```

Example frontend env name:

```text
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Production depends on deployment. Do not hardcode a production URL that is not configured.

## JSON Client Types

Success responses generally use:

```ts
type ApiSuccess<T> = {
  data: T;
};
```

Errors use:

```ts
type ApiError = {
  error: {
    code: string;
    message: string;
    details: null | unknown;
    requestId: string;
  };
};
```

Useful unions:

```ts
type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

type WeekDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";
```

Do not include `passwordHash` in frontend types. The API never returns it.

## Authentication

Login with `POST /auth/login`. The response contains `data.accessToken` and `data.user`.

Send authenticated requests with:

```http
Authorization: Bearer <accessToken>
```

Token handling notes:

- The backend expects a Bearer token.
- The backend does not currently use cookies for authentication.
- Storage strategy belongs to the frontend.
- Avoiding `localStorage` can be preferable for XSS risk, but using an HttpOnly cookie or BFF layer requires additional frontend architecture.
- There is no refresh endpoint and no server-side logout endpoint currently.

## Error Handling

Recommended baseline handling:

| HTTP / Code | Frontend behavior |
| --- | --- |
| `401 UNAUTHORIZED` | Clear current auth state and ask the user to login again |
| `403 FORBIDDEN` | Show a permission/role error, do not retry automatically |
| `400 VALIDATION_ERROR` | Map `error.details[]` to form fields when possible |
| `409 APPOINTMENT_SLOT_UNAVAILABLE` | Refresh slots and ask the patient to choose another slot |
| Other `409` | Show conflict-specific message based on `error.code` |
| `500 INTERNAL_SERVER_ERROR` | Show generic error and include `requestId` for support/debugging |

## Patient Flow

1. Register with `POST /auth/register`.
2. Login with `POST /auth/login`.
3. Read current user with `GET /auth/me`.
4. List doctors with `GET /doctors`.
5. View one doctor with `GET /doctors/:id`.
6. Fetch slots with `GET /doctors/:id/slots?date=YYYY-MM-DD`.
7. Book with `POST /appointments` using `doctorId` and a returned `scheduledAt`.
8. List own appointments with `GET /appointments`.
9. View appointment detail with `GET /appointments/:id`.
10. Cancel with `PATCH /appointments/:id/cancel`.

Important patient notes:

- `POST /auth/register` creates a patient account but does not return an access token.
- Patient identity is derived from the JWT; never send `patientId`.
- `GET /doctors/:id/slots` is informational. Booking can still fail with `409 APPOINTMENT_SLOT_UNAVAILABLE` due to race conditions or patient conflicts.

## Doctor Flow

1. An `ADMIN` creates the doctor account with `POST /doctors`.
2. Doctor logs in with `POST /auth/login`.
3. Doctor reads current user with `GET /auth/me`.
4. Doctor lists own appointments with `GET /doctors/me/appointments`.
5. Doctor reads one appointment with `GET /doctors/me/appointments/:id`.
6. Doctor updates allowed status with `PATCH /doctors/me/appointments/:id/status`.

Allowed doctor transitions:

| From | To | Restriction |
| --- | --- | --- |
| `PENDING` | `CONFIRMED` | Future appointment only |
| `CONFIRMED` | `COMPLETED` | Not future |
| `CONFIRMED` | `NO_SHOW` | Not future |

If the appointment already has the target status, the backend returns it unchanged.

## Admin Flow

1. Bootstrap the first admin from the backend environment with `npm run bootstrap:admin`.
2. Login with `POST /auth/login`.
3. Manage specialties with `/specialties` endpoints.
4. Create doctor accounts with `POST /doctors`.
5. Manage doctor profiles with `PATCH /doctors/:id` and `DELETE /doctors/:id`.
6. Manage weekly availability blocks with `/availabilities` endpoints.
7. Inspect bookable slots with `GET /doctors/:id/slots?date=YYYY-MM-DD`.

The bootstrap script is not an HTTP endpoint and must not be called from the frontend.

## Slots And Booking

Use:

```http
GET /doctors/:id/slots?date=YYYY-MM-DD
```

Roles: `PATIENT`, `ADMIN`.

Response:

```json
{
  "data": [
    {
      "scheduledAt": "2026-09-07T12:00:00.000Z"
    }
  ]
}
```

Display logic:

- Treat `scheduledAt` as an instant.
- Format it for display in the intended user timezone.
- Do not generate slots on the frontend.
- Re-fetch slots after a booking conflict or cancellation.

Blocking logic:

- `PENDING` and `CONFIRMED` appointments block slots.
- `CANCELLED`, `COMPLETED`, and `NO_SHOW` do not block slots.

## Timezone

Operational timezone:

```text
America/Argentina/Cordoba
```

Frontend implications:

- Availability is modeled as Cordoba local weekly blocks.
- Slot `date=YYYY-MM-DD` means a Cordoba calendar date.
- API `scheduledAt` values are ISO datetimes representing instants, serialized as UTC by JSON.
- For display, use `Intl.DateTimeFormat` or an equivalent date library with explicit timezone behavior.
- Multi-timezone scheduling is not implemented by the backend currently.

## CORS

The backend accepts browser requests only from `FRONTEND_URL` or requests with no `Origin` header. In development `.env.example` sets:

```text
FRONTEND_URL=http://localhost:3000
```

If your Next.js dev server runs on a different origin, update backend environment configuration. Do not change frontend code to bypass CORS.

## Bootstrap Admin

Backend command:

```bash
npm run bootstrap:admin
```

Required backend environment variables:

```text
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
BOOTSTRAP_ADMIN_FIRST_NAME=
BOOTSTRAP_ADMIN_LAST_NAME=
```

Rules:

- Creates only the first `ADMIN`.
- Fails if an admin already exists.
- Fails if the email is already registered.
- Not an HTTP endpoint.
- Never store real credentials in the repository.

## Endpoint Summary For Frontend

| Flow | Endpoint |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Role probes | `GET /auth/admin`, `GET /auth/doctor`, `GET /auth/patient` |
| Specialties | `GET /specialties`, `GET /specialties/:id`, `POST /specialties`, `PATCH /specialties/:id`, `DELETE /specialties/:id` |
| Doctors | `GET /doctors`, `GET /doctors/:id`, `POST /doctors`, `PATCH /doctors/:id`, `DELETE /doctors/:id` |
| Slots | `GET /doctors/:id/slots?date=YYYY-MM-DD` |
| Doctor appointments | `GET /doctors/me/appointments`, `GET /doctors/me/appointments/:id`, `PATCH /doctors/me/appointments/:id/status` |
| Availabilities | `GET /availabilities`, `GET /availabilities/:id`, `POST /availabilities`, `PATCH /availabilities/:id`, `DELETE /availabilities/:id` |
| Patient appointments | `GET /appointments`, `GET /appointments/:id`, `POST /appointments`, `PATCH /appointments/:id/cancel` |

For full request/response contracts, see `docs/api.md`.
