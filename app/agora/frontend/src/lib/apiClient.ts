import axios from "axios";

/**
 * Unwrapea el envelope { data, message, statusCode } del TransformInterceptor
 * de NestJS. Si la respuesta ya es el dato directo, la devuelve tal cual.
 * Compatible con backend con o sin TransformInterceptor.
 */
export function unwrapEnvelope<T>(json: unknown): T {
  if (
    json !== null &&
    typeof json === "object" &&
    !Array.isArray(json) &&
    "data" in (json as object) &&
    "statusCode" in (json as object)
  ) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/**
 * Instancia axios con interceptor que unwrapea el envelope automáticamente.
 */
const apiClient = axios.create();

apiClient.interceptors.response.use((response) => {
  const body = response.data;
  if (
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "data" in body &&
    "statusCode" in body
  ) {
    response.data = body.data;
  }
  return response;
});

export default apiClient;
