import { apiClient } from './client'
import type { Analytics } from './types'

export const analyticsApi = {
  get: async (year: number, currency: string): Promise<Analytics> => {
    const { data } = await apiClient.get<Analytics>('/analytics', { params: { year, currency } })
    return data
  },
}
