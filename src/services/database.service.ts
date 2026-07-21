import { prisma } from "../config/prisma.js";

type DatabaseCheckResult = {
  connected: boolean;
};

export async function checkDatabaseConnection(): Promise<DatabaseCheckResult> {
  await prisma.$queryRaw`SELECT 1`;

  return {
    connected: true
  };
}