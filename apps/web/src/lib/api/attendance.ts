import { apiFetch } from './client';
import { toQueryString } from './query';
import type { AttendanceRecord, PaginatedData } from './types';

export type QueryAttendanceOptions = {
  employeeId?: string;
  date?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export type AdminCheckInPayload = {
  employeeId: string;
  workDate: string;
  occurredAt: string;
  faceSimilarity?: number;
  latitude?: number;
  longitude?: number;
  note?: string;
};

export type AdminCheckOutPayload = {
  employeeId: string;
  workDate: string;
  occurredAt: string;
  latitude?: number;
  longitude?: number;
  note?: string;
};

export async function getAttendance(
  query: QueryAttendanceOptions,
  accessToken?: string,
): Promise<PaginatedData<AttendanceRecord>> {
  const queryString = toQueryString(query as Record<string, string | number | undefined>);
  return apiFetch<PaginatedData<AttendanceRecord>>(`/api/attendance${queryString}`, {
    method: 'GET',
    accessToken,
  });
}

export async function adminCheckIn(
  payload: AdminCheckInPayload,
  accessToken?: string,
): Promise<void> {
  return apiFetch<void>('/api/attendance/manual/check-in', {
    method: 'POST',
    body: payload,
    accessToken,
  });
}

export async function adminCheckOut(
  payload: AdminCheckOutPayload,
  accessToken?: string,
): Promise<void> {
  return apiFetch<void>('/api/attendance/manual/check-out', {
    method: 'POST',
    body: payload,
    accessToken,
  });
}

export async function finalizeDay(
  workDate: string,
  accessToken?: string,
): Promise<void> {
  return apiFetch<void>('/api/attendance/admin/finalize-day', {
    method: 'POST',
    body: { workDate },
    accessToken,
  });
}
