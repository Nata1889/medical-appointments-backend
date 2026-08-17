# API Reference

This document describes the current HTTP contract of the Medical Appointments API for frontend consumers. It is derived from the current Express routes, controllers, services, schemas, and integration tests.

## Base URL

Development base URL:

```text
http://localhost:4000
```

Production URLs depend on deployment configuration and are not defined in this repository.

## Runtime And CORS

The app loads runtime configuration through `src/config/env.ts` using `dotenv/config`.

Required environment variables:

| Variable | Meaning |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | HTTP listen port. `.env.example` uses `4000` |
| `FRONTEND_URL` | The only browser origin accepted by CORS, besides requests without an `Origin` header |
| `JSON_BODY_LIMIT` | Express JSON body size limit |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | JWT signing secret, at least 32 characters |
| `JWT_ACCESS_EXPIRES_IN` | JWT access token lifetime, like `15m`, `1h`, `7d`, or `30s` |

CORS currently allows credentials and accepts requests when the request has no `Origin` header or when `Origin === FRONTEND_URL`. A disallowed origin returns `403 CORS_ORIGIN_NOT_ALLOWED`.

## Response Envelope

Most successful application responses use:

```json
{
  "data": {}
}
```

List endpoints use the same envelope with an array:

```json
{
  "data": []
}
```

`GET /health` is the exception. It returns health fields directly and does not use the `data` envelope.

Errors use this exact envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email"
      }
    ],
    "requestId": "..."
  }
}
```

`details` is `null` when no structured details are available. Every handled error response includes `requestId`.

## Authentication

Authenticated endpoints require:

```http
Authorization: Bearer <accessToken>
```

`POST /auth/login` returns a JWT access token. The token is signed with `HS256`, issuer `medical-appointments-api`, and audience `medical-appointments-client`.

Authentication rules:

- The user must still exist and be active.
- The role in the database must match the role in the token.
- Invalid, expired, malformed, or missing tokens return `401 UNAUTHORIZED`.
- There is no refresh token endpoint currently.
- There is no server-side logout endpoint currently.
- The backend does not use cookies for auth; it expects a Bearer token.

## Roles

| Role | Responsibility |
| --- | --- |
| `PATIENT` | Browse doctors, inspect doctor slots, create/list/view/cancel own appointments |
| `DOCTOR` | List own appointments, view own appointment details, update allowed appointment statuses |
| `ADMIN` | Manage specialties, doctors, availabilities, and inspect doctor slots |

## Enums

### UserRole

```ts
type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";
```

### WeekDay

```ts
type WeekDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";
```

### AppointmentStatus

| Status | Meaning |
| --- | --- |
| `PENDING` | Appointment requested and awaiting doctor confirmation |
| `CONFIRMED` | Appointment confirmed by doctor |
| `CANCELLED` | Appointment cancelled by patient |
| `COMPLETED` | Appointment completed by doctor |
| `NO_SHOW` | Patient did not attend |

## Pagination

Pagination is not currently implemented. List endpoints do not accept `page`, `limit`, `offset`, or cursor parameters unless explicitly documented below.

## Health

### GET /health

Auth: none.

Success `200`:

```json
{
  "status": "ok",
  "service": "medical-appointments-api",
  "environment": "development",
  "timestamp": "2026-09-07T12:00:00.000Z"
}
```

## Auth

### POST /auth/register

Auth: none.

Creates a `User` with role `PATIENT` and a linked `Patient` profile. The request cannot set `role`.

Request body:

```json
{
  "firstName": "Alice",
  "lastName": "Patient",
  "email": "alice@example.com",
  "password": "Password1"
}
```

Rules:

- `firstName`, `lastName`: 2-100 chars.
- `email`: valid email, max 254 chars, normalized by schema.
- `password`: 8-72 chars, must contain lowercase, uppercase, and number.

Success `201`:

```json
{
  "data": {
    "id": "uuid",
    "firstName": "Alice",
    "lastName": "Patient",
    "email": "alice@example.com",
    "role": "PATIENT",
    "isActive": true,
    "createdAt": "2026-09-07T12:00:00.000Z"
  }
}
```

Important errors: `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_REGISTERED`.

### POST /auth/login

Auth: none.

Request body:

```json
{
  "email": "alice@example.com",
  "password": "Password1"
}
```

Success `200`:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "Alice",
      "lastName": "Patient",
      "email": "alice@example.com",
      "role": "PATIENT",
      "isActive": true
    },
    "accessToken": "jwt"
  }
}
```

Important errors: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`.

### GET /auth/me

Auth: Bearer token.

Success `200`:

```json
{
  "data": {
    "id": "uuid",
    "firstName": "Alice",
    "lastName": "Patient",
    "email": "alice@example.com",
    "role": "PATIENT",
    "isActive": true
  }
}
```

Important errors: `401 UNAUTHORIZED`.

### GET /auth/admin

Auth: Bearer token. Role: `ADMIN`.

Success `200`:

```json
{
  "data": {
    "role": "ADMIN"
  }
}
```

Important errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### GET /auth/doctor

Auth: Bearer token. Role: `DOCTOR`.

Success `200`:

```json
{
  "data": {
    "role": "DOCTOR"
  }
}
```

Important errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### GET /auth/patient

Auth: Bearer token. Role: `PATIENT`.

Success `200`:

```json
{
  "data": {
    "role": "PATIENT"
  }
}
```

Important errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

## Specialties

Specialty response shape:

```json
{
  "id": "uuid",
  "name": "Cardiology",
  "description": "Heart care",
  "isActive": true
}
```

### POST /specialties

Auth: Bearer token. Role: `ADMIN`.

Request body:

```json
{
  "name": "Cardiology",
  "description": "Heart care"
}
```

`description` is optional. `isActive` is created as `true`.

Success `201`: `{ "data": Specialty }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 SPECIALTY_ALREADY_EXISTS`.

### GET /specialties

Auth: Bearer token. Roles: any authenticated user.

Returns active specialties ordered by name.

Success `200`: `{ "data": Specialty[] }`.

Important errors: `401 UNAUTHORIZED`.

### GET /specialties/:id

Auth: Bearer token. Roles: any authenticated user.

Path params: `id` UUID.

Returns only active specialties.

Success `200`: `{ "data": Specialty }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 SPECIALTY_NOT_FOUND`.

### PATCH /specialties/:id

Auth: Bearer token. Role: `ADMIN`.

Path params: `id` UUID.

Request body, at least one field:

```json
{
  "name": "Cardiology",
  "description": "Heart care",
  "isActive": true
}
```

Success `200`: `{ "data": Specialty }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 SPECIALTY_NOT_FOUND`, `409 SPECIALTY_ALREADY_EXISTS`.

### DELETE /specialties/:id

Auth: Bearer token. Role: `ADMIN`.

Soft-deactivates the specialty by setting `isActive=false`. If already inactive, returns the current inactive record.

Success `200`: `{ "data": Specialty }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 SPECIALTY_NOT_FOUND`.

## Doctors

Doctor public response shape:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "firstName": "Dana",
  "lastName": "Doctor",
  "specialty": {
    "id": "uuid",
    "name": "Cardiology"
  },
  "professionalLicense": "ABC123",
  "isActive": true
}
```

Doctor creation response omits `userId`.

### POST /doctors

Auth: Bearer token. Role: `ADMIN`.

Creates a `User(role=DOCTOR)` and a `Doctor` in one transaction. Do not send `userId`.

Request body:

```json
{
  "firstName": "Dana",
  "lastName": "Doctor",
  "email": "doctor@example.com",
  "password": "Password1",
  "specialtyId": "uuid",
  "professionalLicense": "ABC123"
}
```

Success `201`:

```json
{
  "data": {
    "id": "uuid",
    "firstName": "Dana",
    "lastName": "Doctor",
    "specialty": {
      "id": "uuid",
      "name": "Cardiology"
    },
    "professionalLicense": "ABC123",
    "isActive": true
  }
}
```

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 SPECIALTY_NOT_FOUND`, `409 EMAIL_ALREADY_REGISTERED`, `409 DOCTOR_LICENSE_ALREADY_EXISTS`.

### GET /doctors

Auth: Bearer token. Roles: any authenticated user.

Returns active doctors whose user and specialty are active, ordered by user last name then first name.

Success `200`: `{ "data": Doctor[] }`.

Important errors: `401 UNAUTHORIZED`.

### GET /doctors/:id

Auth: Bearer token. Roles: any authenticated user.

Path params: `id` UUID.

Returns an active doctor whose user and specialty are active.

Success `200`: `{ "data": Doctor }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 DOCTOR_NOT_FOUND`.

### PATCH /doctors/:id

Auth: Bearer token. Role: `ADMIN`.

Path params: `id` UUID.

Request body, at least one field:

```json
{
  "specialtyId": "uuid",
  "professionalLicense": "ABC123",
  "isActive": true
}
```

Success `200`: `{ "data": Doctor }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 DOCTOR_NOT_FOUND`, `404 SPECIALTY_NOT_FOUND`, `409 DOCTOR_LICENSE_ALREADY_EXISTS`.

### DELETE /doctors/:id

Auth: Bearer token. Role: `ADMIN`.

Soft-deactivates the doctor by setting `isActive=false`. If already inactive, returns the current inactive record.

Success `200`: `{ "data": Doctor }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 DOCTOR_NOT_FOUND`.

## Doctor Slots

### GET /doctors/:id/slots?date=YYYY-MM-DD

Auth: Bearer token. Roles: `PATIENT`, `ADMIN`.

Path params: `id` UUID.

Query params:

| Name | Required | Meaning |
| --- | --- | --- |
| `date` | yes | Calendar date in `YYYY-MM-DD`, interpreted in `America/Argentina/Cordoba` |

Success `200`:

```json
{
  "data": [
    {
      "scheduledAt": "2026-09-07T12:00:00.000Z"
    }
  ]
}
```

Rules:

- Each item contains only `scheduledAt`.
- `scheduledAt` is an ISO UTC datetime string representing an instant.
- Past dates return an empty array.
- For today, `scheduledAt <= now` is excluded.
- The doctor, the doctor's user, and the doctor's specialty must all be active.
- Slots are generated from all matching weekly availability blocks.
- A slot is included when `slotStart + slotDuration <= endTimeMinutes`; `endTimeMinutes` itself is not included as a start.
- `PENDING` and `CONFIRMED` appointments block slots.
- `CANCELLED`, `COMPLETED`, and `NO_SHOW` appointments do not block slots.
- The endpoint is informational. `POST /appointments` remains the final authority; a booking can still fail with `409 APPOINTMENT_SLOT_UNAVAILABLE` due to concurrent booking or patient-level conflicts.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 DOCTOR_NOT_FOUND`.

## Doctor Appointments

Doctor appointment response shape:

```json
{
  "id": "uuid",
  "scheduledAt": "2026-09-07T12:00:00.000Z",
  "reason": "Follow-up",
  "status": "PENDING",
  "createdAt": "2026-09-01T12:00:00.000Z",
  "patient": {
    "id": "uuid",
    "firstName": "Alice",
    "lastName": "Patient"
  }
}
```

### GET /doctors/me/appointments

Auth: Bearer token. Role: `DOCTOR`.

Query params:

| Name | Required | Meaning |
| --- | --- | --- |
| `status` | no | One `AppointmentStatus` |
| `from` | no | ISO datetime with timezone |
| `to` | no | ISO datetime with timezone |

If both `from` and `to` are sent, `from <= to` is required.

Success `200`: `{ "data": DoctorAppointment[] }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 DOCTOR_PROFILE_NOT_FOUND`.

### GET /doctors/me/appointments/:id

Auth: Bearer token. Role: `DOCTOR`.

Returns only appointments belonging to the authenticated doctor's profile.

Success `200`: `{ "data": DoctorAppointment }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 APPOINTMENT_NOT_FOUND`, `409 DOCTOR_PROFILE_NOT_FOUND`.

### PATCH /doctors/me/appointments/:id/status

Auth: Bearer token. Role: `DOCTOR`.

Request body:

```json
{
  "status": "CONFIRMED"
}
```

Allowed target statuses: `CONFIRMED`, `COMPLETED`, `NO_SHOW`.

Allowed transitions:

| From | To | Temporal rule |
| --- | --- | --- |
| `PENDING` | `CONFIRMED` | Appointment must be in the future |
| `CONFIRMED` | `COMPLETED` | Appointment must not be in the future |
| `CONFIRMED` | `NO_SHOW` | Appointment must not be in the future |

If the appointment already has the requested status, the endpoint returns the appointment without changing it.

Success `200`: `{ "data": DoctorAppointment }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 APPOINTMENT_NOT_FOUND`, `409 APPOINTMENT_STATUS_TRANSITION_NOT_ALLOWED`, `409 DOCTOR_PROFILE_NOT_FOUND`.

## Availabilities

Availability represents recurring weekly blocks, not concrete appointment slots.

Availability response shape:

```json
{
  "id": "uuid",
  "doctorId": "uuid",
  "weekDay": "MONDAY",
  "startTimeMinutes": 540,
  "endTimeMinutes": 660,
  "slotDurationMinutes": 30
}
```

`startTimeMinutes` and `endTimeMinutes` are minutes since local midnight in `America/Argentina/Cordoba`. Example: `540` is 09:00.

### POST /availabilities

Auth: Bearer token. Role: `ADMIN`.

Request body:

```json
{
  "doctorId": "uuid",
  "weekDay": "MONDAY",
  "startTimeMinutes": 540,
  "endTimeMinutes": 660,
  "slotDurationMinutes": 30
}
```

Rules:

- `startTimeMinutes`: integer `0..1439`.
- `endTimeMinutes`: integer `1..1440`.
- `startTimeMinutes < endTimeMinutes`.
- `slotDurationMinutes` must be positive.
- Duration must fit and divide the block evenly.
- Doctor, doctor user, and specialty must be active.
- Blocks for the same doctor and weekday cannot overlap.

Success `201`: `{ "data": Availability }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 DOCTOR_NOT_FOUND`, `409 AVAILABILITY_OVERLAP`.

### GET /availabilities

Auth: Bearer token. Roles: any authenticated user.

Query params:

| Name | Required | Meaning |
| --- | --- | --- |
| `doctorId` | no | Filter by doctor UUID |
| `weekDay` | no | Filter by `WeekDay` |

Returns blocks sorted by weekday, start time, then end time.

Success `200`: `{ "data": Availability[] }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`.

### GET /availabilities/:id

Auth: Bearer token. Roles: any authenticated user.

Success `200`: `{ "data": Availability }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 AVAILABILITY_NOT_FOUND`.

### PATCH /availabilities/:id

Auth: Bearer token. Role: `ADMIN`.

Request body, at least one field:

```json
{
  "doctorId": "uuid",
  "weekDay": "MONDAY",
  "startTimeMinutes": 540,
  "endTimeMinutes": 660,
  "slotDurationMinutes": 30
}
```

The final resulting block must satisfy the same rules as creation.

Success `200`: `{ "data": Availability }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 AVAILABILITY_NOT_FOUND`, `404 DOCTOR_NOT_FOUND`, `409 AVAILABILITY_OVERLAP`.

### DELETE /availabilities/:id

Auth: Bearer token. Role: `ADMIN`.

Deletes the availability record.

Success `200`: `{ "data": Availability }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 AVAILABILITY_NOT_FOUND`.

## Patient Appointments

Patient appointment list/detail response shape:

```json
{
  "id": "uuid",
  "scheduledAt": "2026-09-07T12:00:00.000Z",
  "reason": "Follow-up",
  "status": "PENDING",
  "createdAt": "2026-09-01T12:00:00.000Z",
  "doctor": {
    "id": "uuid",
    "firstName": "Dana",
    "lastName": "Doctor",
    "professionalLicense": "ABC123",
    "specialty": {
      "id": "uuid",
      "name": "Cardiology"
    }
  }
}
```

Appointment creation response includes IDs directly:

```json
{
  "id": "uuid",
  "patientId": "uuid",
  "doctorId": "uuid",
  "scheduledAt": "2026-09-07T12:00:00.000Z",
  "reason": "Follow-up",
  "status": "PENDING",
  "createdAt": "2026-09-01T12:00:00.000Z"
}
```

### POST /appointments

Auth: Bearer token. Role: `PATIENT`.

The patient is derived from the JWT. Do not send `patientId`.

Request body:

```json
{
  "doctorId": "uuid",
  "scheduledAt": "2026-09-07T12:00:00.000Z",
  "reason": "Follow-up"
}
```

`reason` is optional, trimmed, 1-500 chars when present. `scheduledAt` must be an ISO datetime with timezone, for example `Z` or `-03:00`.

Rules:

- `scheduledAt` must be in the future.
- Doctor, doctor user, and specialty must be active.
- `scheduledAt` must fall inside one of the doctor's weekly availability blocks in the operational timezone.
- `scheduledAt` seconds and milliseconds must be zero.
- `scheduledAt` must align with the block's `slotDurationMinutes`.
- Active appointments with status `PENDING` or `CONFIRMED` block doctor+time.
- Active appointments with status `PENDING` or `CONFIRMED` block patient+time.
- `CANCELLED`, `COMPLETED`, and `NO_SHOW` do not block slots.

Success `201`: `{ "data": CreatedAppointment }`.

Important errors: `400 VALIDATION_ERROR`, `400 APPOINTMENT_IN_PAST`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 DOCTOR_NOT_FOUND`, `409 PATIENT_PROFILE_NOT_FOUND`, `409 APPOINTMENT_SLOT_UNAVAILABLE`.

### GET /appointments

Auth: Bearer token. Role: `PATIENT`.

Query params:

| Name | Required | Meaning |
| --- | --- | --- |
| `status` | no | One `AppointmentStatus` |
| `from` | no | ISO datetime with timezone |
| `to` | no | ISO datetime with timezone |

If both `from` and `to` are sent, `from <= to` is required.

Success `200`: `{ "data": PatientAppointment[] }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 PATIENT_PROFILE_NOT_FOUND`.

### GET /appointments/:id

Auth: Bearer token. Role: `PATIENT`.

Returns only appointments belonging to the authenticated patient.

Success `200`: `{ "data": PatientAppointment }`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 APPOINTMENT_NOT_FOUND`, `409 PATIENT_PROFILE_NOT_FOUND`.

### PATCH /appointments/:id/cancel

Auth: Bearer token. Role: `PATIENT`.

Cancellation rules:

- Only own appointments can be cancelled.
- `CANCELLED` is idempotent and returns the appointment unchanged.
- Only `PENDING` and `CONFIRMED` future appointments can be newly cancelled.
- Other statuses or past appointments return `409 APPOINTMENT_CANNOT_BE_CANCELLED`.

Success `200`: `{ "data": PatientAppointment }` with `status: "CANCELLED"`.

Important errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 APPOINTMENT_NOT_FOUND`, `409 APPOINTMENT_CANNOT_BE_CANCELLED`, `409 PATIENT_PROFILE_NOT_FOUND`.

## Appointment Status Actions

| Actor | From | To | Restriction |
| --- | --- | --- | --- |
| `PATIENT` | `PENDING` | `CANCELLED` | Appointment must be in the future |
| `PATIENT` | `CONFIRMED` | `CANCELLED` | Appointment must be in the future |
| `PATIENT` | `CANCELLED` | `CANCELLED` | Idempotent |
| `DOCTOR` | `PENDING` | `CONFIRMED` | Appointment must be in the future |
| `DOCTOR` | `CONFIRMED` | `COMPLETED` | Appointment must not be in the future |
| `DOCTOR` | `CONFIRMED` | `NO_SHOW` | Appointment must not be in the future |

There are no admin appointment status transitions currently.

## Timezone

Operational timezone:

```text
America/Argentina/Cordoba
```

Rules:

- Availability blocks are defined in the operational local timezone.
- The `date` query for doctor slots is a Cordoba calendar date.
- `scheduledAt` values travel through the API as ISO datetimes representing instants, usually serialized as UTC with `Z`.
- The frontend should parse `scheduledAt` as an instant.
- For display, format appointment times in the intended user-facing timezone.
- The frontend should not reconstruct availability or slot generation manually; use `GET /doctors/:id/slots`.
- Multi-timezone scheduling is not implemented currently.

## Error Codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Request params, query, or body failed Zod validation |
| `INVALID_JSON` | 400 | Request body contains malformed JSON |
| `APPOINTMENT_IN_PAST` | 400 | Appointment creation attempted for `scheduledAt <= now` |
| `UNAUTHORIZED` | 401 | Missing, invalid, expired token, inactive user, or token role mismatch |
| `INVALID_CREDENTIALS` | 401 | Login email/password invalid or user inactive |
| `FORBIDDEN` | 403 | Authenticated user lacks the required role |
| `CORS_ORIGIN_NOT_ALLOWED` | 403 | Request origin does not match `FRONTEND_URL` |
| `ROUTE_NOT_FOUND` | 404 | No route matched the request method/path |
| `SPECIALTY_NOT_FOUND` | 404 | Specialty does not exist or is inactive where active is required |
| `DOCTOR_NOT_FOUND` | 404 | Doctor does not exist, is inactive, or has inactive user/specialty where active is required |
| `AVAILABILITY_NOT_FOUND` | 404 | Availability does not exist |
| `APPOINTMENT_NOT_FOUND` | 404 | Appointment does not exist or does not belong to the authenticated actor |
| `EMAIL_ALREADY_REGISTERED` | 409 | Email is already used |
| `SPECIALTY_ALREADY_EXISTS` | 409 | Specialty name is already used |
| `DOCTOR_LICENSE_ALREADY_EXISTS` | 409 | Professional license is already used |
| `PATIENT_PROFILE_NOT_FOUND` | 409 | Authenticated user has no active patient profile |
| `DOCTOR_PROFILE_NOT_FOUND` | 409 | Authenticated user has no active doctor profile |
| `AVAILABILITY_OVERLAP` | 409 | Availability overlaps an existing block for the same doctor/day |
| `APPOINTMENT_SLOT_UNAVAILABLE` | 409 | Slot is unavailable, invalid for doctor availability, or conflicts with active doctor/patient appointment |
| `APPOINTMENT_CANNOT_BE_CANCELLED` | 409 | Appointment cannot be cancelled in its current status or time |
| `APPOINTMENT_STATUS_TRANSITION_NOT_ALLOWED` | 409 | Doctor status transition is not allowed |
| `REQUEST_BODY_TOO_LARGE` | 413 | Request body exceeded `JSON_BODY_LIMIT` |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

## Bootstrap First Admin

Command:

```bash
npm run bootstrap:admin
```

Required environment variables:

| Variable | Meaning |
| --- | --- |
| `BOOTSTRAP_ADMIN_EMAIL` | Admin email |
| `BOOTSTRAP_ADMIN_PASSWORD` | Admin password, same validation rules as registration password |
| `BOOTSTRAP_ADMIN_FIRST_NAME` | Admin first name |
| `BOOTSTRAP_ADMIN_LAST_NAME` | Admin last name |

Rules:

- This is a script, not an HTTP endpoint.
- Do not call it from the frontend.
- It creates only the first `ADMIN` user.
- It fails if any admin already exists.
- It fails if the email is already registered.
- Do not commit real admin credentials.

Script output/error codes include `ADMIN_CREATED`, `ADMIN_ALREADY_EXISTS`, `BOOTSTRAP_ADMIN_VALIDATION_ERROR`, and `EMAIL_ALREADY_REGISTERED`.
