import type { Request, Response } from "express";

import {
  availabilityIdParamsSchema,
  createAvailabilitySchema,
  getAvailabilitiesQuerySchema,
} from "../schemas/availability.schema.js";
import {
  createAvailability as createAvailabilityService,
  getAvailabilities as getAvailabilitiesService,
  getAvailabilityById as getAvailabilityByIdService,
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
