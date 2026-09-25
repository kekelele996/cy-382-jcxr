import type { Board, CreatePlanItemPayload, TripSummary, UpdatePlanItemPayload } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public data: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) }
  });
  let body: any;
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.code ?? 'REQUEST_FAILED',
      body?.message ?? `请求失败 ${response.status}`,
      body ?? {}
    );
  }
  return body as T;
}

export function fetchTrips() {
  return api<TripSummary[]>('/trips');
}

export function createTrip(input: Partial<TripSummary> & { ownerId: number }) {
  return api<TripSummary>('/trips', { method: 'POST', body: JSON.stringify(input) });
}

export function fetchBoard(tripId: number) {
  return api<Board>(`/trips/${tripId}/board`);
}

export function createPlanItem(tripId: number, payload: CreatePlanItemPayload) {
  return api<Board>(`/trips/${tripId}/board/items`, { method: 'POST', body: JSON.stringify(payload) });
}

export function updatePlanItem(tripId: number, itemId: number, payload: UpdatePlanItemPayload) {
  return api<Board>(`/trips/${tripId}/board/items/${itemId}`, { method: 'POST', body: JSON.stringify(payload) });
}
