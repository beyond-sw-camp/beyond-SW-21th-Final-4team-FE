export type EmployerPlanType = 'FREE' | 'PRO' | 'PRIME';

export const normalizeEmployerPlan = (plan?: string): EmployerPlanType => {
  const normalizedPlan = (plan ?? 'FREE').trim().toUpperCase();

  if (['PRO', 'PARTNER', '프로 플랜'.toUpperCase()].includes(normalizedPlan)) {
    return 'PRO';
  }

  if (['PRIME', 'ENTERPRISE', '프라임 플랜'.toUpperCase()].includes(normalizedPlan)) {
    return 'PRIME';
  }

  return 'FREE';
};
