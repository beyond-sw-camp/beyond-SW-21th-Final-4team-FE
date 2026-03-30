const DIGIT_ONLY_REGEX = /\D/g;

export const normalizePhoneForSubmit = (value: string | null | undefined): string => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(DIGIT_ONLY_REGEX, '');
    if (!digits) return '';
    return `+${digits}`;
  }

  return trimmed.replace(DIGIT_ONLY_REGEX, '');
};

export const formatPhoneNumber = (value: string | null | undefined): string => {
  const normalized = normalizePhoneForSubmit(value);
  if (!normalized) return '';

  if (normalized.startsWith('+')) {
    return normalized;
  }

  if (normalized.length === 11) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
  }

  if (normalized.length === 10) {
    if (normalized.startsWith('02')) {
      return `${normalized.slice(0, 2)}-${normalized.slice(2, 6)}-${normalized.slice(6)}`;
    }

    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }

  if (normalized.length === 9 && normalized.startsWith('02')) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`;
  }

  return normalized;
};
