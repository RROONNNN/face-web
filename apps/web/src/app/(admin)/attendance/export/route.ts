import { getApiBaseUrl } from '@/lib/env';
import { getSession } from '@/lib/auth/session';

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ message: 'Authentication required.' }, { status: 401 });
  }

  if (session.user.accountRole !== 'admin') {
    return Response.json({ message: 'Admin authentication required.' }, { status: 403 });
  }

  const requestUrl = new URL(request.url);
  const apiUrl = new URL('/api/reports/attendance/monthly', getApiBaseUrl());

  for (const key of ['month', 'employeeId', 'departmentId']) {
    const value = requestUrl.searchParams.get(key);
    if (value) {
      apiUrl.searchParams.set(key, value);
    }
  }

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await response.text();
    return new Response(message, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type':
        response.headers.get('Content-Type') ??
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        response.headers.get('Content-Disposition') ??
        'attachment; filename="attendance-report.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
