import type { Request, Response } from "express";

import { createSpecialtySchema } from "../schemas/specialty.schema.js";
import { createSpecialty as createSpecialtyService } from "../services/specialty.service.js";
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
