const pad = (value: number) => String(value).padStart(2, '0');

const parseDateValue = (value: string) => {
  const trimmed = value.trim();
  const pickerMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (pickerMatch) {
    const year = Number(pickerMatch[1]);
    const month = Number(pickerMatch[2]);
    const day = Number(pickerMatch[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }

    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const formatDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const parsed = parseDateValue(value);
  if (!parsed) {
    return '-';
  }

  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
};

export const toApiDateInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  ) {
    return `${pad(day)}/${pad(month)}/${year}`;
  }

  return null;
};

export const toPickerDateInput = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
};