import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

let isShuttingDown = false;

const server = app
  .listen(env.PORT, () => {
    console.log(`API running at http://localhost:${env.PORT}`);
  })
  .on("error", (error) => {
    console.error("Fatal error starting HTTP server:", error);
    void shutdown("STARTUP_ERROR", 1);
  });

function closeHttpServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`Received ${signal}. Closing application...`);

  let finalExitCode = exitCode;

  try {
    await closeHttpServer();
  } catch (error) {
    finalExitCode = 1;
    console.error("Error closing the HTTP server:", error);
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    finalExitCode = 1;
    console.error("Error disconnecting Prisma:", error);
  }

  if (finalExitCode === 0) {
    console.log("Application closed successfully.");
  }

  process.exit(finalExitCode);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
