import type { NextFunction, Request, Response } from "express";

import { checkDatabaseConnection } from "../services/database.service.js";

export async function getHealth(
  _request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const database = await checkDatabaseConnection();

    response.status(200).json({
      status: "ok",
      service: "medical-appointments-api",
      database,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}