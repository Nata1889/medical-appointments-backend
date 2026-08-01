import type { Request, Response } from "express";

import {
  createSpecialtySchema,
  specialtyIdParamsSchema,
  updateSpecialtySchema,
} from "../schemas/specialty.schema.js";
import {
  createSpecialty as createSpecialtyService,
  deleteSpecialty as deleteSpecialtyService,
  getSpecialties as getSpecialtiesService,
  getSpecialtyById as getSpecialtyByIdService,
  updateSpecialty as updateSpecialtyService,
} from "../services/specialty.service.js";
import { validationErrorFromZod } from "../utils/zod-error.js";

export async function createSpecialty(
  request: Request,
  response: Response,
): Promise<void> {
  const result = createSpecialtySchema.safeParse(request.body);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  const specialty = await createSpecialtyService(result.data);

  response.status(201).json({
    data: specialty,
  });
}

export async function getSpecialties(
  _request: Request,
  response: Response,
): Promise<void> {
  const specialties = await getSpecialtiesService();

  response.status(200).json({
    data: specialties,
  });
}

export async function getSpecialtyById(
  request: Request,
  response: Response,
): Promise<void> {
  const result = specialtyIdParamsSchema.safeParse(request.params);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  const specialty = await getSpecialtyByIdService(result.data.id);

  response.status(200).json({
    data: specialty,
  });
}

export async function updateSpecialty(
  request: Request,
  response: Response,
): Promise<void> {
  const paramsResult = specialtyIdParamsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    throw validationErrorFromZod(paramsResult.error);
  }

  const bodyResult = updateSpecialtySchema.safeParse(request.body);

  if (!bodyResult.success) {
    throw validationErrorFromZod(bodyResult.error);
  }

  const specialty = await updateSpecialtyService(paramsResult.data.id, bodyResult.data);

  response.status(200).json({
    data: specialty,
  });
}

export async function deleteSpecialty(
  request: Request,
  response: Response,
): Promise<void> {
  const result = specialtyIdParamsSchema.safeParse(request.params);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  const specialty = await deleteSpecialtyService(result.data.id);

  response.status(200).json({
    data: specialty,
  });
}
