import { apiFetch } from './client';
import { toQueryString } from './query';
import type { LeaveRequest, PaginatedData } from './types';

export type QueryLeaveRequestsOptions = {
  status?: string;
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
};

export type RejectLeaveRequestPayload = {
  reason: string;
};

export async function getLeaveRequests(
  query: QueryLeaveRequestsOptions,
  accessToken?: string,
): Promise<PaginatedData<LeaveRequest>> {
  const queryString = toQueryString(query as Record<string, string | number | undefined>);
  return apiFetch<PaginatedData<LeaveRequest>>(`/api/leave${queryString}`, {
    method: 'GET',
    accessToken,
  });
}

export async function getLeaveRequest(
  id: string,
  accessToken?: string,
): Promise<LeaveRequest> {
  return apiFetch<LeaveRequest>(`/api/leave/${id}`, {
    method: 'GET',
    accessToken,
  });
}

export async function approveLeaveRequest(
  id: string,
  accessToken?: string,
): Promise<void> {
  return apiFetch<void>(`/api/leave/${id}/approve`, {
    method: 'PUT',
    accessToken,
  });
}

export async function rejectLeaveRequest(
  id: string,
  payload: RejectLeaveRequestPayload,
  accessToken?: string,
): Promise<void> {
  return apiFetch<void>(`/api/leave/${id}/reject`, {
    method: 'PUT',
    body: payload,
    accessToken,
  });
}
