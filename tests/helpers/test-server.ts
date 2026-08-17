import "./test-env.js";

import type { Server } from "node:http";

export type TestServer = {
  baseUrl: string;
  server: Server;
};

export async function startTestServer(): Promise<TestServer> {
  const { app } = await import("../../src/app.js");

  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (typeof address !== "object" || address === null) {
        throw new Error("Test server did not bind to a TCP port");
      }

      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        server,
      });
    });
  });
}

export function stopTestServer(testServer: TestServer): Promise<void> {
  return new Promise((resolve, reject) => {
    testServer.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
