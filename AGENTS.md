# Medical Appointments API

## Commands
- Dev server: `npm run dev` (`tsx watch src/server.ts`).
- Production build: `npm run build` (`tsc`, outputs to `dist/`).
- Type-only check: `npm run typecheck` (`tsc --noEmit`).
- Start built app: `npm start` (`node dist/server.js`).

## Architecture
- `src/app.ts` builds and exports the Express app; keep listener/process shutdown logic in `src/server.ts`.
- Register HTTP paths in `src/routes/*`; route handlers live in `src/controllers/*`.
- Put business logic in `src/services/*` when it exists; do not put future database access in controllers.
- Health route is mounted as `app.use("/api/health", healthRouter)`, and the router handles `GET /`.

## TypeScript And Imports
- The project is ESM (`"type": "module"`) with `module`/`moduleResolution` set to `NodeNext`.
- Local TypeScript imports must include `.js` extensions, even when importing `.ts` source files.
- Strict flags include `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`; avoid `any`.

## Environment
- Runtime env is loaded by `src/config/env.ts` via `import "dotenv/config"` and validated with Zod.
- Current env keys are `NODE_ENV`, `PORT`, and `FRONTEND_URL`; update `.env.example` when adding keys.
- Never modify `.env` or commit secrets.

## Verification
- After code changes, run `npm run typecheck` and `npm run build`.
- If adding a configured test runner later, add the focused test command here and run it for relevant changes.

## Medical AI Safety
- Future AI components must not diagnose, prescribe medication, recommend dosages, replace professional care, or invent doctors/specialties/appointment slots.
- An appointment agent must never create or cancel appointments without explicit user confirmation.

## Current database setup

- PostgreSQL runs locally through Docker Compose.
- Prisma ORM is configured with the `prisma-client` generator.
- Prisma Client is generated into `src/generated/prisma`.
- PostgreSQL access uses `@prisma/adapter-pg`.
- The Prisma instance lives in `src/config/prisma.ts`.
- The schema includes the initial medical appointments domain models.
- Migrations include manual SQL objects that Prisma cannot fully represent, including partial unique indexes and `CHECK` constraints.
- Consult `docs/database-constraints.md` before editing migrations or appointment/availability constraints.
- Do not use `prisma db push` in this project.
- Do not create models or migrations unless explicitly requested.

## Database commands

- `npm run db:up`: starts PostgreSQL.
- `npm run db:down`: stops PostgreSQL.
- `npm run db:logs`: follows PostgreSQL logs.
- `npm run db:reset`: removes PostgreSQL and its local volume.
- `npm run prisma:validate`: validates the Prisma schema.
- `npm run prisma:generate`: generates Prisma Client.
- `npm run prisma:studio`: opens Prisma Studio.
