'use server';

import {
  checkboxValue,
  encodeNotice,
  optionalNumber,
  optionalString,
  parseWorkPeriods,
  requiredString,
} from '@/lib/admin/form';
import { authenticatedApiFetch } from '@/lib/api/authenticated';
import { toQueryString } from '@/lib/api/query';
import type { Department, FaceImportSummary, GeofenceConfig, Shift, User } from '@/lib/api/types';
import { getSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function requireAdmin() {
  const session = await getSession();

  if (!session || session.user.accountRole !== 'admin') {
    throw new Error('Admin authentication required.');
  }
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  let location = '/employees/new';

  try {
    const user = await authenticatedApiFetch<User>('/api/auth/register', {
      method: 'POST',
      body: compactBody({
        employeeCode: optionalString(formData.get('employeeCode')),
        name: requiredString(formData.get('name')),
        password: requiredString(formData.get('password')),
        accountRole: optionalString(formData.get('accountRole')),
        departmentId: optionalString(formData.get('departmentId')),
        jobTitle: optionalString(formData.get('jobTitle')),
        phone: optionalString(formData.get('phone')),
        email: optionalString(formData.get('email')),
        dateOfBirth: optionalString(formData.get('dateOfBirth')),
      }),
    });

    revalidatePath('/employees');
    location = `/employees/${user.id}${encodeNotice({ success: 'User created.' })}`;
  } catch (error) {
    location = `/employees/new${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function updateUserAction(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData.get('id'));
  let location = `/employees/${id}`;

  try {
    await authenticatedApiFetch<User>(`/api/users/${id}`, {
      method: 'PATCH',
      body: compactBody({
        employeeCode: optionalString(formData.get('employeeCode')),
        name: optionalString(formData.get('name')),
        password: optionalString(formData.get('password')),
        accountRole: optionalString(formData.get('accountRole')),
        departmentId: optionalString(formData.get('departmentId')),
        jobTitle: optionalString(formData.get('jobTitle')),
        phone: optionalString(formData.get('phone')),
        email: optionalString(formData.get('email')),
        dateOfBirth: optionalString(formData.get('dateOfBirth')),
      }),
    });

    revalidatePath('/employees');
    revalidatePath(`/employees/${id}`);
    location = `/employees/${id}${encodeNotice({ success: 'User updated.' })}`;
  } catch (error) {
    location = `/employees/${id}${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function deactivateUserAction(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData.get('id'));
  let location = `/employees/${id}`;

  try {
    await authenticatedApiFetch<User>(`/api/users/${id}/deactivate`, {
      method: 'PATCH',
    });

    revalidatePath('/employees');
    revalidatePath(`/employees/${id}`);
    location = `/employees/${id}${encodeNotice({ success: 'User deactivated.' })}`;
  } catch (error) {
    location = `/employees/${id}${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function createShiftAction(formData: FormData) {
  await requireAdmin();

  let location = '/shifts/new';

  try {
    const shift = await authenticatedApiFetch<Shift>('/api/shifts', {
      method: 'POST',
      body: compactBody({
        name: requiredString(formData.get('name')),
        lateGraceMinutes: optionalNumber(formData.get('lateGraceMinutes')) ?? 0,
        isActive: checkboxValue(formData, 'isActive'),
        workPeriods: parseWorkPeriods(formData),
      }),
    });

    revalidatePath('/shifts');
    location = `/shifts/${shift.id}${encodeNotice({ success: 'Shift created.' })}`;
  } catch (error) {
    location = `/shifts/new${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function updateShiftAction(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData.get('id'));
  let location = `/shifts/${id}`;

  try {
    await authenticatedApiFetch<Shift>(`/api/shifts/${id}`, {
      method: 'PATCH',
      body: compactBody({
        name: requiredString(formData.get('name')),
        lateGraceMinutes: optionalNumber(formData.get('lateGraceMinutes')) ?? 0,
        isActive: checkboxValue(formData, 'isActive'),
        workPeriods: parseWorkPeriods(formData),
      }),
    });

    revalidatePath('/shifts');
    revalidatePath(`/shifts/${id}`);
    location = `/shifts/${id}${encodeNotice({ success: 'Shift updated.' })}`;
  } catch (error) {
    location = `/shifts/${id}${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function deactivateShiftAction(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData.get('id'));
  let location = `/shifts/${id}`;

  try {
    await authenticatedApiFetch<Shift>(`/api/shifts/${id}/deactivate`, {
      method: 'PATCH',
    });

    revalidatePath('/shifts');
    revalidatePath(`/shifts/${id}`);
    location = `/shifts/${id}${encodeNotice({ success: 'Shift deactivated.' })}`;
  } catch (error) {
    location = `/shifts/${id}${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function createDepartmentAction(formData: FormData) {
  await requireAdmin();

  let location = '/departments/new';

  try {
    const department = await authenticatedApiFetch<Department>('/api/departments', {
      method: 'POST',
      body: compactBody({
        code: requiredString(formData.get('code')).toUpperCase(),
        name: requiredString(formData.get('name')),
        description: optionalString(formData.get('description')),
        isActive: checkboxValue(formData, 'isActive'),
        defaultShiftId: requiredString(formData.get('defaultShiftId')),
      }),
    });

    revalidatePath('/departments');
    location = `/departments/${department.id}${encodeNotice({ success: 'Department created.' })}`;
  } catch (error) {
    location = `/departments/new${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function updateDepartmentAction(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData.get('id'));
  let location = `/departments/${id}`;

  try {
    await authenticatedApiFetch<Department>(`/api/departments/${id}`, {
      method: 'PATCH',
      body: compactBody({
        code: requiredString(formData.get('code')).toUpperCase(),
        name: requiredString(formData.get('name')),
        description: optionalString(formData.get('description')),
        isActive: checkboxValue(formData, 'isActive'),
        defaultShiftId: requiredString(formData.get('defaultShiftId')),
      }),
    });

    revalidatePath('/departments');
    revalidatePath(`/departments/${id}`);
    location = `/departments/${id}${encodeNotice({ success: 'Department updated.' })}`;
  } catch (error) {
    location = `/departments/${id}${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function upsertShiftAssignmentAction(formData: FormData) {
  await requireAdmin();

  let location = '/shift-assignments';

  try {
    await authenticatedApiFetch('/api/shifts/assignments', {
      method: 'POST',
      body: compactBody({
        employeeId: requiredString(formData.get('employeeId')),
        shiftId: requiredString(formData.get('shiftId')),
        workDate: requiredString(formData.get('workDate')),
        note: optionalString(formData.get('note')),
      }),
    });

    revalidatePath('/shift-assignments');
    location = `/shift-assignments${encodeNotice({ success: 'Assignment saved.' })}`;
  } catch (error) {
    location = `/shift-assignments${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function generateShiftAssignmentsAction(formData: FormData) {
  await requireAdmin();

  let location = '/shift-assignments';

  try {
    const queryString = toQueryString({
      startDate: optionalString(formData.get('startDate')),
      endDate: optionalString(formData.get('endDate')),
      employeeId: optionalString(formData.get('employeeId')),
    });

    await authenticatedApiFetch(`/api/shifts/assignments/generate${queryString}`, {
      method: 'POST',
    });

    revalidatePath('/shift-assignments');
    location = `/shift-assignments${encodeNotice({ success: 'Assignments generated.' })}`;
  } catch (error) {
    location = `/shift-assignments${encodeNotice({ error })}`;
  }

  redirect(location);
}

function compactBody<T extends Record<string, unknown>>(body: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined && value !== ''),
  );
}

function nullableNumber(value: FormDataEntryValue | null): number | null | undefined {
  const text = String(value ?? '').trim();

  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildOccurredAt(workDate: string, timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(workDate);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export async function adminCheckInAction(formData: FormData) {
  await requireAdmin();
  const returnPath = safeReturnPath(formData.get('returnPath')) ?? '/attendance';
  let location = returnPath;

  try {
    const workDate = requiredString(formData.get('workDate'));
    const occurredAtTime = requiredString(formData.get('occurredAt'));
    await authenticatedApiFetch('/api/attendance/manual/check-in', {
      method: 'POST',
      body: compactBody({
        employeeId: requiredString(formData.get('employeeId')),
        workDate,
        occurredAt: buildOccurredAt(workDate, occurredAtTime),
        faceSimilarity: optionalNumber(formData.get('faceSimilarity')),
        latitude: optionalNumber(formData.get('latitude')),
        longitude: optionalNumber(formData.get('longitude')),
        note: optionalString(formData.get('note')),
      }),
    });

    revalidatePath('/attendance');
    revalidatePath(revalidationPath(returnPath));
    location = appendNotice(returnPath, encodeNotice({ success: 'Manual check-in successful.' }));
  } catch (error) {
    location = appendNotice(returnPath, encodeNotice({ error }));
  }

  redirect(location);
}

export async function adminCheckOutAction(formData: FormData) {
  await requireAdmin();
  const returnPath = safeReturnPath(formData.get('returnPath')) ?? '/attendance';
  let location = returnPath;

  try {
    const workDate = requiredString(formData.get('workDate'));
    const occurredAtTime = requiredString(formData.get('occurredAt'));
    await authenticatedApiFetch('/api/attendance/manual/check-out', {
      method: 'POST',
      body: compactBody({
        employeeId: requiredString(formData.get('employeeId')),
        workDate,
        occurredAt: buildOccurredAt(workDate, occurredAtTime),
        latitude: optionalNumber(formData.get('latitude')),
        longitude: optionalNumber(formData.get('longitude')),
        note: optionalString(formData.get('note')),
      }),
    });

    revalidatePath('/attendance');
    revalidatePath(revalidationPath(returnPath));
    location = appendNotice(returnPath, encodeNotice({ success: 'Manual check-out successful.' }));
  } catch (error) {
    location = appendNotice(returnPath, encodeNotice({ error }));
  }

  redirect(location);
}

function safeReturnPath(value: FormDataEntryValue | null): string | undefined {
  const text = optionalString(value);
  if (!text || !text.startsWith('/') || text.startsWith('//')) {
    return undefined;
  }

  return text;
}

function revalidationPath(path: string): string {
  return path.split('?')[0] || path;
}

function appendNotice(path: string, notice: string): string {
  if (!notice) return path;

  const [pathname, currentQuery = ''] = path.split('?');
  const params = new URLSearchParams(currentQuery);
  const noticeParams = new URLSearchParams(notice.replace(/^\?/, ''));

  for (const [key, value] of noticeParams) {
    params.set(key, value);
  }

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export async function finalizeDayAction(formData: FormData) {
  await requireAdmin();
  const returnPath = safeReturnPath(formData.get('returnPath')) ?? '/attendance';
  let location = returnPath;

  try {
    await authenticatedApiFetch('/api/attendance/admin/finalize-day', {
      method: 'POST',
      body: compactBody({
        workDate: requiredString(formData.get('workDate')),
      }),
    });

    revalidatePath('/attendance');
    revalidatePath(revalidationPath(returnPath));
    location = appendNotice(returnPath, encodeNotice({ success: 'Day finalized.' }));
  } catch (error) {
    location = appendNotice(returnPath, encodeNotice({ error }));
  }

  redirect(location);
}

export async function approveLeaveAction(formData: FormData) {
  await requireAdmin();
  const id = requiredString(formData.get('id'));
  let location = `/leave-requests/${id}`;

  try {
    await authenticatedApiFetch(`/api/leave/${id}/approve`, {
      method: 'PUT',
    });

    revalidatePath('/leave-requests');
    revalidatePath(`/leave-requests/${id}`);
    location = `/leave-requests/${id}${encodeNotice({ success: 'Leave request approved.' })}`;
  } catch (error) {
    location = `/leave-requests/${id}${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function rejectLeaveAction(formData: FormData) {
  await requireAdmin();
  const id = requiredString(formData.get('id'));
  let location = `/leave-requests/${id}`;

  try {
    await authenticatedApiFetch(`/api/leave/${id}/reject`, {
      method: 'PUT',
      body: compactBody({
        reason: requiredString(formData.get('reason')),
      }),
    });

    revalidatePath('/leave-requests');
    revalidatePath(`/leave-requests/${id}`);
    location = `/leave-requests/${id}${encodeNotice({ success: 'Leave request rejected.' })}`;
  } catch (error) {
    location = `/leave-requests/${id}${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function upsertGeofenceConfigAction(formData: FormData) {
  await requireAdmin();

  let location = '/geofence';

  try {
    await authenticatedApiFetch<GeofenceConfig>('/api/geofence', {
      method: 'PUT',
      body: {
        centerLat: nullableNumber(formData.get('centerLat')),
        centerLon: nullableNumber(formData.get('centerLon')),
        radiusMeters: nullableNumber(formData.get('radiusMeters')),
      },
    });

    revalidatePath('/geofence');
    location = `/geofence${encodeNotice({ success: 'Geofence settings saved.' })}`;
  } catch (error) {
    location = `/geofence${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function importEmployeeFacesAction(formData: FormData) {
  await requireAdmin();

  let location = '/employee-faces';

  try {
    const file = requiredFile(formData.get('file'));
    const upload = new FormData();
    upload.set('file', file);

    const summary = await authenticatedApiFetch<FaceImportSummary>('/api/face/sync/file', {
      method: 'POST',
      body: upload,
    });

    revalidatePath('/employee-faces');
    location = `/employee-faces${encodeNotice({ success: formatFaceImportSummary(summary) })}`;
  } catch (error) {
    location = `/employee-faces${encodeNotice({ error })}`;
  }

  redirect(location);
}

export async function deleteEmployeeFaceAction(formData: FormData) {
  await requireAdmin();

  let location = '/employee-faces';

  try {
    const employeeId = requiredString(formData.get('employeeId'));
    await authenticatedApiFetch(`/api/face/${employeeId}`, {
      method: 'DELETE',
    });

    revalidatePath('/employee-faces');
    location = `/employee-faces${encodeNotice({ success: 'Face data deleted.' })}`;
  } catch (error) {
    location = `/employee-faces${encodeNotice({ error })}`;
  }

  redirect(location);
}

function requiredFile(value: FormDataEntryValue | null): File {
  if (!(value instanceof File) || value.size === 0) {
    throw new Error('JSON file is required.');
  }

  return value;
}

function formatFaceImportSummary(summary: FaceImportSummary): string {
  const skippedCount = summary.skipped.length;

  return `Imported ${summary.imported} of ${summary.total} records (${summary.created} created, ${summary.updated} updated, ${skippedCount} skipped).`;
}
