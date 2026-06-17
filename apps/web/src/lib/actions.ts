'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { LoginPayload } from '@face-web/shared';
import { AccountRole } from '@face-web/shared';
import { backendFetch, messageFromError } from './api';
import { clearSession, getRefreshToken, setSession } from './session';

export type ActionState = {
  error?: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length > 0 ? value : undefined;
}

function optionalNumber(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length > 0 ? Number(value) : undefined;
}

function cleanBody<T extends Record<string, unknown>>(body: T) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}

function returnTo(formData: FormData, fallback: string) {
  const value = text(formData, 'returnTo');
  return value.startsWith('/') ? value : fallback;
}

function withMessage(path: string, key: 'message' | 'error', value: string) {
  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.delete('message');
  params.delete('error');
  params.set(key, value);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

async function mutate(
  formData: FormData,
  fallback: string,
  operation: () => Promise<void>,
  successMessage: string,
) {
  const destination = returnTo(formData, fallback);
  let target = withMessage(destination, 'message', successMessage);

  try {
    await operation();
    revalidatePath(destination.split('?')[0]);
  } catch (error) {
    target = withMessage(destination, 'error', messageFromError(error));
  }

  redirect(target);
}

export async function loginAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const employeeCode = text(formData, 'employeeCode');
  const password = text(formData, 'password');

  try {
    const payload = await backendFetch<LoginPayload>('/auth/login', {
      auth: false,
      method: 'POST',
      body: { employeeCode, password },
    });

    if (payload.user.accountRole !== AccountRole.Admin) {
      return { error: 'Only admin accounts can access the web portal.' };
    }

    await setSession({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    });
  } catch (error) {
    return { error: messageFromError(error) };
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  const refreshToken = await getRefreshToken();

  try {
    if (refreshToken) {
      await backendFetch('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
      });
    }
  } catch {
    // Clearing local cookies is still the right UX if the backend session ended.
  }

  await clearSession();
  redirect('/login');
}

export async function createEmployeeAction(formData: FormData) {
  await mutate(
    formData,
    '/employees',
    () =>
      backendFetch('/employees', {
        method: 'POST',
        body: cleanBody({
          name: text(formData, 'name'),
          department: optionalText(formData, 'department'),
          jobTitle: optionalText(formData, 'jobTitle'),
          phone: optionalText(formData, 'phone'),
          email: optionalText(formData, 'email'),
          dateOfBirth: optionalText(formData, 'dateOfBirth'),
        }),
      }),
    'Employee created.',
  );
}

export async function updateEmployeeAction(id: string, formData: FormData) {
  await mutate(
    formData,
    '/employees',
    () =>
      backendFetch(`/employees/${id}`, {
        method: 'PUT',
        body: cleanBody({
          name: text(formData, 'name'),
          department: optionalText(formData, 'department'),
          jobTitle: optionalText(formData, 'jobTitle'),
          phone: optionalText(formData, 'phone'),
          email: optionalText(formData, 'email'),
          dateOfBirth: optionalText(formData, 'dateOfBirth'),
        }),
      }),
    'Employee updated.',
  );
}

export async function createShiftAction(formData: FormData) {
  await mutate(
    formData,
    '/shifts',
    () =>
      backendFetch('/shifts', {
        method: 'POST',
        body: {
          name: text(formData, 'name'),
          startTime: text(formData, 'startTime'),
          endTime: text(formData, 'endTime'),
        },
      }),
    'Shift created.',
  );
}

export async function updateShiftAction(id: string, formData: FormData) {
  await mutate(
    formData,
    '/shifts',
    () =>
      backendFetch(`/shifts/${id}`, {
        method: 'PUT',
        body: {
          name: text(formData, 'name'),
          startTime: text(formData, 'startTime'),
          endTime: text(formData, 'endTime'),
        },
      }),
    'Shift updated.',
  );
}

export async function activateShiftAction(id: string, formData: FormData) {
  await mutate(
    formData,
    '/shifts',
    () => backendFetch(`/shifts/${id}/activate`, { method: 'PUT' }),
    'Shift activated.',
  );
}

export async function deleteShiftAction(id: string, formData: FormData) {
  await mutate(
    formData,
    '/shifts',
    () => backendFetch(`/shifts/${id}`, { method: 'DELETE' }),
    'Shift deleted.',
  );
}

export async function createManualCheckInAction(formData: FormData) {
  await mutate(
    formData,
    '/attendance',
    () =>
      backendFetch('/attendance/manual/checkIn', {
        method: 'POST',
        body: cleanBody({
          empId: text(formData, 'empId'),
          time: text(formData, 'time'),
          workDate: text(formData, 'workDate'),
          lat: optionalNumber(formData, 'lat'),
          lon: optionalNumber(formData, 'lon'),
        }),
      }),
    'Manual check-in created.',
  );
}

export async function createManualCheckOutAction(formData: FormData) {
  await mutate(
    formData,
    '/attendance',
    () =>
      backendFetch('/attendance/manual/checkOut', {
        method: 'POST',
        body: cleanBody({
          empId: text(formData, 'empId'),
          time: text(formData, 'time'),
          workDate: text(formData, 'workDate'),
          lat: optionalNumber(formData, 'lat'),
          lon: optionalNumber(formData, 'lon'),
        }),
      }),
    'Manual check-out created.',
  );
}

export async function updateAttendanceEventAction(
  type: 'checkIn' | 'checkOut',
  id: string,
  formData: FormData,
) {
  await mutate(
    formData,
    '/attendance',
    () =>
      backendFetch(`/attendance/${type}/${id}`, {
        method: 'PUT',
        body: cleanBody({
          time: text(formData, 'time'),
          workDate: text(formData, 'workDate'),
          lat: optionalNumber(formData, 'lat'),
          lon: optionalNumber(formData, 'lon'),
          isOutOfZone: formData.get('isOutOfZone') === 'on',
        }),
      }),
    'Attendance event updated.',
  );
}

export async function deleteAttendanceEventAction(
  type: 'checkIn' | 'checkOut',
  id: string,
  formData: FormData,
) {
  await mutate(
    formData,
    '/attendance',
    () => backendFetch(`/attendance/${type}/${id}`, { method: 'DELETE' }),
    'Attendance event deleted.',
  );
}

export async function approveLeaveAction(id: string, formData: FormData) {
  await mutate(
    formData,
    '/leave',
    () => backendFetch(`/leave/${id}/approve`, { method: 'PUT' }),
    'Leave request approved.',
  );
}

export async function rejectLeaveAction(id: string, formData: FormData) {
  await mutate(
    formData,
    '/leave',
    () =>
      backendFetch(`/leave/${id}/reject`, {
        method: 'PUT',
        body: { reason: text(formData, 'reason') || 'Rejected by admin' },
      }),
    'Leave request rejected.',
  );
}

export async function deleteFaceDataAction(employeeId: string, formData: FormData) {
  await mutate(
    formData,
    '/face',
    () => backendFetch(`/face/${employeeId}`, { method: 'DELETE' }),
    'Face data deleted.',
  );
}

export async function updateGeofenceAction(formData: FormData) {
  await mutate(
    formData,
    '/geofence',
    () =>
      backendFetch('/config/geofence', {
        method: 'PUT',
        body: {
          centerLat: Number(text(formData, 'centerLat')),
          centerLon: Number(text(formData, 'centerLon')),
          radiusMeters: Number(text(formData, 'radiusMeters')),
        },
      }),
    'Geofence updated.',
  );
}
