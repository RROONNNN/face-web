'use server';

import { redirect } from 'next/navigation';
import { apiFetch, getApiErrorMessage } from '@/lib/api/client';
import type { AuthPayload } from '@/lib/api/types';
import { clearSession, getSession, persistSession } from '@/lib/auth/session';

export type LoginActionState = {
  message: string | null;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const employeeCode = String(formData.get('employeeCode') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!employeeCode || !password) {
    return { message: 'Employee code and password are required.' };
  }

  let payload: AuthPayload;

  try {
    payload = await apiFetch<AuthPayload>('/api/auth/login', {
      method: 'POST',
      body: { employeeCode, password },
    });
  } catch (error) {
    return { message: getApiErrorMessage(error) };
  }

  if (payload.user.accountRole !== 'admin') {
    await clearSession();
    return { message: 'Only admin accounts can access this portal.' };
  }

  await persistSession(payload);
  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();

  if (session) {
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        accessToken: session.accessToken,
        body: {
          userId: session.user.id,
          refreshToken: session.refreshToken,
        },
      });
    } catch {
      // Local session cleanup should still happen if the backend token is stale.
    }
  }

  await clearSession();
  redirect('/login');
}
