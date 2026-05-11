import { apiClient } from './client'
import type { DepositOut, DepositCreate, DepositUpdate } from './types'

export const depositsApi = {
  list: async (): Promise<DepositOut[]> => {
    const { data } = await apiClient.get<DepositOut[]>('/deposits')
    return data
  },

  get: async (id: string): Promise<DepositOut> => {
    const { data } = await apiClient.get<DepositOut>(`/deposits/${id}`)
    return data
  },

  create: async (payload: DepositCreate): Promise<DepositOut> => {
    const { data } = await apiClient.post<DepositOut>('/deposits', payload)
    return data
  },

  update: async (id: string, payload: DepositUpdate): Promise<DepositOut> => {
    const { data } = await apiClient.put<DepositOut>(`/deposits/${id}`, payload)
    return data
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/deposits/${id}`)
  },
}
