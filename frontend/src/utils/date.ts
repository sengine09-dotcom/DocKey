const pad = (value: number) => String(value).padStart(2, '0');

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const parseDateValue = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const formatDate = (value?: string | null) => {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return '-';
  }

  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
};

export const formatDateTime = (value?: string | null) => {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return '-';
  }

  return parsed.toLocaleString();
};

export const getExpiryStatus = (value?: string | null) => {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return {
      formattedDate: '-',
      daysUntilExpiry: null as number | null,
      level: 'none' as 'none' | 'normal' | 'warning' | 'critical' | 'expired',
      message: 'Token นี้ไม่มีวันหมดอายุ',
    };
  }

  const today = startOfDay(new Date());
  const expiryDay = startOfDay(parsed);
  const diffDays = Math.ceil((expiryDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return {
      formattedDate: formatDate(value),
      daysUntilExpiry: diffDays,
      level: 'expired' as const,
      message: 'Token นี้หมดอายุแล้ว กรุณาติดต่อ vendor เพื่อออก token ใหม่',
    };
  }

  if (diffDays === 0) {
    return {
      formattedDate: formatDate(value),
      daysUntilExpiry: diffDays,
      level: 'critical' as const,
      message: 'Token นี้หมดอายุวันนี้',
    };
  }

  if (diffDays === 1) {
    return {
      formattedDate: formatDate(value),
      daysUntilExpiry: diffDays,
      level: 'critical' as const,
      message: 'Token นี้จะหมดอายุพรุ่งนี้',
    };
  }

  if (diffDays <= 7) {
    return {
      formattedDate: formatDate(value),
      daysUntilExpiry: diffDays,
      level: 'warning' as const,
      message: `Token นี้ใกล้หมดอายุในอีก ${diffDays} วัน`,
    };
  }

  return {
    formattedDate: formatDate(value),
    daysUntilExpiry: diffDays,
    level: 'normal' as const,
    message: `Token นี้ยังใช้งานได้ อีก ${diffDays} วันก่อนหมดอายุ`,
  };
};