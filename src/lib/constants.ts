export const CURRENCIES = ['USD', 'EUR', 'RUB', 'GEL', 'BYN'] as const
export type Currency = (typeof CURRENCIES)[number]

export const BILLING_CYCLE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  biennial: '2 years',
  one_time: 'One-time',
}

export const INTEREST_TYPE_LABELS: Record<string, string> = {
  simple: 'Simple',
  compound: 'Compound',
}

export const COMPOUND_FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
}
