import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import {
  appointmentIdParamsSchema,
  getAppointmentsQuerySchema,
  updateDoctorAppointmentStatusSchema,
} from "../schemas/appointment.schema.js";
import {
  createDoctorSchema,
  doctorIdParamsSchema,
  getDoctorSlotsQuerySchema,
  updateDoctorSchema,
} from "../schemas/doctor.schema.js";
import {
  createDoctor as createDoctorService,
  deleteDoctor as deleteDoctorService,
  getAuthenticatedDoctorAppointmentById as getAuthenticatedDoctorAppointmentByIdService,
  getAuthenticatedDoctorAppointments as getAuthenticatedDoctorAppointmentsService,
  getDoctorById as getDoctorByIdService,
  getDoctorAvailableSlots as getDoctorAvailableSlotsService,
  getDoctors as getDoctorsService,
  updateAuthenticatedDoctorAppointmentStatus as updateAuthenticatedDoctorAppointmentStatusService,
  updateDoctor as updateDoctorService,
} from "../services/doctor.service.js";
import { validationErrorFromZod } from "../utils/zod-error.js";

function authenticationRequiredError(): AppError {
  return new AppError({
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Authentication required",
    details: null,
  });
}

export async function getDoctors(
  _request: Request,
  response: Response,
): Promise<void> {
  const doctors = await getDoctorsService();

  response.status(200).json({
    data: doctors,
  });
}

export async function getDoctorById(
  request: Request,
  response: Response,
): Promise<void> {
  const result = doctorIdParamsSchema.safeParse(request.params);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  const doctor = await getDoctorByIdService(result.data.id);

  response.status(200).json({
    data: doctor,
  });
}

export async function getDoctorAppointments(
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

  const appointments = await getAuthenticatedDoctorAppointmentsService(
    request.user.userId,
    result.data,
  );

  response.status(200).json({
    data: appointments,
  });
}

export async function getDoctorAvailableSlots(
  request: Request,
  response: Response,
): Promise<void> {
  const paramsResult = doctorIdParamsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    throw validationErrorFromZod(paramsResult.error);
  }

  const queryResult = getDoctorSlotsQuerySchema.safeParse(request.query);

  if (!queryResult.success) {
    throw validationErrorFromZod(queryResult.error);
  }

  const slots = await getDoctorAvailableSlotsService(
    paramsResult.data.id,
    queryResult.data.date,
  );

  response.status(200).json({
    data: slots,
  });
}

export async function getDoctorAppointmentById(
  request: Request,
  response: Response,
): Promise<void> {
  const paramsResult = appointmentIdParamsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    throw validationErrorFromZod(paramsResult.error);
  }

  if (!request.user) {
    throw authenticationRequiredError();
  }

  const appointment = await getAuthenticatedDoctorAppointmentByIdService(
    request.user.userId,
    paramsResult.data.id,
  );

  response.status(200).json({
    data: appointment,
  });
}

export async function updateDoctorAppointmentStatus(
  request: Request,
  response: Response,
): Promise<void> {
  const paramsResult = appointmentIdParamsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    throw validationErrorFromZod(paramsResult.error);
  }

  const bodyResult = updateDoctorAppointmentStatusSchema.safeParse(request.body);

  if (!bodyResult.success) {
    throw validationErrorFromZod(bodyResult.error);
  }

  if (!request.user) {
    throw authenticationRequiredError();
  }

  const appointment = await updateAuthenticatedDoctorAppointmentStatusService(
    request.user.userId,
    paramsResult.data.id,
    bodyResult.data.status,
  );

  response.status(200).json({
    data: appointment,
  });
}

export async function createDoctor(
  request: Request,
  response: Response,
): Promise<void> {
  const result = createDoctorSchema.safeParse(request.body);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  const doctor = await createDoctorService(result.data);

  response.status(201).json({
    data: doctor,
  });
}

export async function updateDoctor(
  request: Request,
  response: Response,
): Promise<void> {
  const paramsResult = doctorIdParamsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    throw validationErrorFromZod(paramsResult.error);
  }

  const bodyResult = updateDoctorSchema.safeParse(request.body);

  if (!bodyResult.success) {
    throw validationErrorFromZod(bodyResult.error);
  }

  const doctor = await updateDoctorService(paramsResult.data.id, bodyResult.data);

  response.status(200).json({
    data: doctor,
  });
}

export async function deleteDoctor(
  request: Request,
  response: Response,
): Promise<void> {
  const result = doctorIdParamsSchema.safeParse(request.params);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  const doctor = await deleteDoctorService(result.data.id);

  response.status(200).json({
    data: doctor,
  });
}
