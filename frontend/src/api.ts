export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.code ?? 'INTERNAL_ERROR', body?.message ?? `请求失败 ${response.status}`, response.status);
  return body as T;
}
