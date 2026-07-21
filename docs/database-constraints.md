# Database Constraints

This project uses PostgreSQL database objects that Prisma cannot fully represent in `schema.prisma`.

## Partial Unique Indexes

The appointment uniqueness rules are implemented with PostgreSQL partial unique indexes instead of Prisma `@@unique` constraints because Prisma does not support partial indexes in the Prisma schema.

These indexes block two active appointments at the exact same `scheduledAt` for the same doctor or the same patient:

```sql
CREATE UNIQUE INDEX "Appointment_active_doctor_scheduledAt_unique"
ON "Appointment" ("doctorId", "scheduledAt")
WHERE "status" <> 'CANCELLED';

CREATE UNIQUE INDEX "Appointment_active_patient_scheduledAt_unique"
ON "Appointment" ("patientId", "scheduledAt")
WHERE "status" <> 'CANCELLED';
```

Appointments with `status = 'CANCELLED'` are ignored by these indexes. This means cancelling an appointment releases that exact time slot for both the doctor and the patient.

## Availability Checks

Availability stores weekly time blocks as minutes from midnight. The database enforces valid ranges and slot durations with `CHECK` constraints:

```sql
ALTER TABLE "Availability"
ADD CONSTRAINT "Availability_startTimeMinutes_range_check"
CHECK ("startTimeMinutes" >= 0 AND "startTimeMinutes" < 1440);

ALTER TABLE "Availability"
ADD CONSTRAINT "Availability_endTimeMinutes_range_check"
CHECK ("endTimeMinutes" > 0 AND "endTimeMinutes" <= 1440);

ALTER TABLE "Availability"
ADD CONSTRAINT "Availability_time_order_check"
CHECK ("startTimeMinutes" < "endTimeMinutes");

ALTER TABLE "Availability"
ADD CONSTRAINT "Availability_slotDurationMinutes_positive_check"
CHECK ("slotDurationMinutes" > 0);

ALTER TABLE "Availability"
ADD CONSTRAINT "Availability_slotDurationMinutes_fits_range_check"
CHECK (
("endTimeMinutes" - "startTimeMinutes") >=
"slotDurationMinutes"
);

ALTER TABLE "Availability"
ADD CONSTRAINT "Availability_slotDurationMinutes_divides_range_check"
CHECK (
("endTimeMinutes" - "startTimeMinutes") %
"slotDurationMinutes" = 0
);
```

Overlapping availability blocks are not enforced by the database in the initial model. They must be validated in services.

## Migration Rules

Do not use `prisma db push` in this project. It can bypass or obscure manually maintained SQL objects that are not represented in `schema.prisma`.

Do not delete or regenerate migrations unless the manual SQL for partial indexes and `CHECK` constraints is preserved.

## Time Zone

The operational time zone is `America/Argentina/Cordoba`.

Concrete appointments are stored as UTC instants in `timestamptz(3)` fields. API inputs and outputs should use explicit ISO 8601 timestamps, preferably with the `Z` UTC suffix once appointment endpoints are implemented.
