import { getApiErrorMessage } from '@/lib/api/client';

export function optionalString(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

export function requiredString(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim();
}

export function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  const text = optionalString(value);

  if (!text) {
    return undefined;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function checkboxValue(formData: FormData, name: string): boolean {
  return formData.get(name) === 'on';
}

export function encodeNotice(params: {
  error?: unknown;
  success?: string;
}): string {
  const searchParams = new URLSearchParams();

  if (params.success) {
    searchParams.set('success', params.success);
  }

  if (params.error) {
    searchParams.set('error', getApiErrorMessage(params.error));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export function parseWorkPeriods(formData: FormData) {
  const periods = [];

  for (let index = 0; index < 4; index += 1) {
    const name = requiredString(formData.get(`workPeriods.${index}.name`));
    const startTime = requiredString(formData.get(`workPeriods.${index}.startTime`));
    const endTime = requiredString(formData.get(`workPeriods.${index}.endTime`));

    if (!name && !startTime && !endTime) {
      continue;
    }

    periods.push({
      name,
      startTime,
      endTime,
      isCrossMidnight: formData.get(`workPeriods.${index}.isCrossMidnight`) === 'on',
    });
  }

  return periods;
}
