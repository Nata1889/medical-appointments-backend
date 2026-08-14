import type { Request, Response } from "express";

import {
  createDoctorSchema,
  doctorIdParamsSchema,
  updateDoctorSchema,
} from "../schemas/doctor.schema.js";
import {
  createDoctor as createDoctorService,
  deleteDoctor as deleteDoctorService,
  getDoctorById as getDoctorByIdService,
  getDoctors as getDoctorsService,
  updateDoctor as updateDoctorService,
} from "../services/doctor.service.js";
import { validationErrorFromZod } from "../utils/zod-error.js";

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
