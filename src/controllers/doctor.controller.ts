import type { Request, Response } from "express";

import { createDoctorSchema } from "../schemas/doctor.schema.js";
import { createDoctor as createDoctorService } from "../services/doctor.service.js";
import { validationErrorFromZod } from "../utils/zod-error.js";

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
