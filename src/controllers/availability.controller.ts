import type { Request, Response } from "express";

import {
  availabilityIdParamsSchema,
  createAvailabilitySchema,
  getAvailabilitiesQuerySchema,
  updateAvailabilitySchema,
} from "../schemas/availability.schema.js";
import {
  createAvailability as createAvailabilityService,
  getAvailabilities as getAvailabilitiesService,
  getAvailabilityById as getAvailabilityByIdService,
  updateAvailability as updateAvailabilityService,
} from "../services/availability.service.js";
import { validationErrorFromZod } from "../utils/zod-error.js";

export async function getAvailabilities(
  request: Request,
  response: Response,
): Promise<void> {
  const result = getAvailabilitiesQuerySchema.safeParse(request.query);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  const availabilities = await getAvailabilitiesService(result.data);

  response.status(200).json({
    data: availabilities,
  });
}

export async function getAvailabilityById(
  request: Request,
  response: Response,
): Promise<void> {
  const result = availabilityIdParamsSchema.safeParse(request.params);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  const availability = await getAvailabilityByIdService(result.data.id);

  response.status(200).json({
    data: availability,
  });
}

export async function updateAvailability(
  request: Request,
  response: Response,
): Promise<void> {
  const paramsResult = availabilityIdParamsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    throw validationErrorFromZod(paramsResult.error);
  }

  const bodyResult = updateAvailabilitySchema.safeParse(request.body);

  if (!bodyResult.success) {
    throw validationErrorFromZod(bodyResult.error);
  }

  const availability = await updateAvailabilityService(paramsResult.data.id, bodyResult.data);

  response.status(200).json({
    data: availability,
  });
}

export async function createAvailability(
  request: Request,
  response: Response,
): Promise<void> {
  const result = createAvailabilitySchema.safeParse(request.body);

  if (!result.success) {
    throw validationErrorFromZod(result.error);
  }

  const availability = await createAvailabilityService(result.data);

  response.status(201).json({
    data: availability,
  });
}
