import { useQuery } from '@tanstack/react-query'

const BASE_URL = 'https://open.er-api.com/v6/latest'

async function fetchRates(baseCurrency: string): Promise<Record<string, number>> {
  const res = await fetch(`${BASE_URL}/${baseCurrency}`)
  if (!res.ok) throw new Error('Exchange rate fetch failed')
  const data = await res.json()
  if (data.result !== 'success') throw new Error(data['error-type'] ?? 'Unknown error')
  return data.rates as Record<string, number>
}

/** React Query hook — rates cached for 24 h */
export function useExchangeRates(baseCurrency: string) {
  return useQuery({
    queryKey: ['exchangeRates', baseCurrency],
    queryFn: () => fetchRates(baseCurrency),
    staleTime:  24 * 60 * 60 * 1000,
    gcTime:     48 * 60 * 60 * 1000,
    retry: 2,
  })
}

/**
 * Convert amount from one currency to another using rates relative to baseCurrency.
 * Returns null if rates don't include from/to.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number | null {
  if (from === to) return amount
  if (rates[from] == null || rates[to] == null) return null
  return amount * (rates[to] / rates[from])
}
