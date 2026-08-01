import type { Request, Response } from "express";

import {
  createSpecialtySchema,
  specialtyIdParamsSchema,
} from "../schemas/specialty.schema.js";
import {
  createSpecialty as createSpecialtyService,
  getSpecialties as getSpecialtiesService,
  getSpecialtyById as getSpecialtyByIdService,
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
