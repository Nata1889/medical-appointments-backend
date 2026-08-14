import type { Request, Response } from "express";

import { createAvailabilitySchema } from "../schemas/availability.schema.js";
import { createAvailability as createAvailabilityService } from "../services/availability.service.js";
import { validationErrorFromZod } from "../utils/zod-error.js";

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
