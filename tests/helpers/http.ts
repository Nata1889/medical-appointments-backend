export type JsonObject = Record<string, unknown>;

export async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(5000),
  });
  const body = await response.json() as unknown;

  return { response, body };
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getErrorCode(body: unknown): string | undefined {
  if (!isJsonObject(body) || !isJsonObject(body.error)) {
    return undefined;
  }

  return typeof body.error.code === "string" ? body.error.code : undefined;
}

export function getDataObject(body: unknown): JsonObject {
  if (!isJsonObject(body) || !isJsonObject(body.data)) {
    throw new Error("Expected response body with object data");
  }

  return body.data;
}

export function getDataArray(body: unknown): JsonObject[] {
  if (!isJsonObject(body) || !Array.isArray(body.data)) {
    throw new Error("Expected response body with array data");
  }

  return body.data.filter(isJsonObject);
}
