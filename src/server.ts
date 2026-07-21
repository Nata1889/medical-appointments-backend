import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

const server = app.listen(env.PORT, () => {
  console.log(`API running at http://localhost:${env.PORT}`);
});

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`Received ${signal}. Closing application...`);

  server.close(async (serverError) => {
    try {
      if (serverError) {
        throw serverError;
      }

      await prisma.$disconnect();

      console.log("Application closed successfully.");
      process.exit(0);
    } catch (error) {
      console.error("Error closing the application:", error);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});