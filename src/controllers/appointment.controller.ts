import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import {
  createAppointmentSchema,
  getAppointmentsQuerySchema,
} from "../schemas/appointment.schema.js";
import {
  createAppointment as createAppointmentService,
  getPatientAppointments as getPatientAppointmentsService,
} from "../services/appointment.service.js";
import { validationErrorFromZod } from "../utils/zod-error.js";

function authenticationRequiredError(): AppError {
  return new AppError({
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Authentication required",
    details: null,
  });
}

export async function createAppointment(
  request: Request,
  response: Response,
): Promise<void> {
  const result = createAppointmentSchema.safeParse(request.body);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  if (!request.user) {
    throw authenticationRequiredError();
  }

  const appointment = await createAppointmentService(result.data, request.user.userId);

  response.status(201).json({
    data: appointment,
  });
}

export async function getAppointments(
  request: Request,
  response: Response,
): Promise<void> {
  const result = getAppointmentsQuerySchema.safeParse(request.query);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  if (!request.user) {
    throw authenticationRequiredError();
  }

  const appointments = await getPatientAppointmentsService(request.user.userId, result.data);

  response.status(200).json({
    data: appointments,
  });
}
