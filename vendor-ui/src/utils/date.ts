const pad = (value: number) => String(value).padStart(2, '0');

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

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

export const getExpiryWarning = (value?: string | null) => {
  if (!value) {
    return {
      formattedDate: '-',
      textClass: 'text-slate-600',
      message: null as string | null,
      messageClass: 'text-slate-500',
    };
  }

  const parsed = parseDateValue(value);
  if (!parsed) {
    return {
      formattedDate: '-',
      textClass: 'text-slate-600',
      message: null as string | null,
      messageClass: 'text-slate-500',
    };
  }

  const today = startOfDay(new Date());
  const expiryDay = startOfDay(parsed);
  const diffDays = Math.ceil((expiryDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return {
      formattedDate: formatDate(value),
      textClass: 'text-slate-400',
      message: 'หมดอายุแล้ว',
      messageClass: 'text-slate-400',
    };
  }

  if (diffDays === 0) {
    return {
      formattedDate: formatDate(value),
      textClass: 'font-semibold text-rose-600',
      message: 'หมดอายุวันนี้',
      messageClass: 'text-rose-600',
    };
  }

  if (diffDays === 1) {
    return {
      formattedDate: formatDate(value),
      textClass: 'font-semibold text-rose-600',
      message: 'พรุ่งนี้หมดอายุ',
      messageClass: 'text-rose-600',
    };
  }

  if (diffDays <= 7) {
    return {
      formattedDate: formatDate(value),
      textClass: 'font-semibold text-amber-600',
      message: `ใกล้หมดอายุในอีก ${diffDays} วัน`,
      messageClass: 'text-amber-600',
    };
  }

  return {
    formattedDate: formatDate(value),
    textClass: 'text-slate-600',
    message: null as string | null,
    messageClass: 'text-slate-500',
  };
};