import { apiClient } from './client'
import type {
  PropertyOut,
  PropertyDetailOut,
  PropertyCreate,
  PropertyUpdate,
  PropertyTransactionOut,
  PropertyTransactionCreate,
  PropertyTransactionUpdate,
  PropertyAnalytics,
} from './types'

export const propertiesApi = {
  list: async (): Promise<PropertyOut[]> => {
    const { data } = await apiClient.get<PropertyOut[]>('/properties')
    return data
  },

  get: async (id: string): Promise<PropertyDetailOut> => {
    const { data } = await apiClient.get<PropertyDetailOut>(`/properties/${id}`)
    return data
  },

  create: async (payload: PropertyCreate): Promise<PropertyOut> => {
    const { data } = await apiClient.post<PropertyOut>('/properties', payload)
    return data
  },

  update: async (id: string, payload: PropertyUpdate): Promise<PropertyDetailOut> => {
    const { data } = await apiClient.put<PropertyDetailOut>(`/properties/${id}`, payload)
    return data
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/properties/${id}`)
  },

  // Transactions
  listTransactions: async (propertyId: string): Promise<PropertyTransactionOut[]> => {
    const { data } = await apiClient.get<PropertyTransactionOut[]>(
      `/properties/${propertyId}/transactions`,
    )
    return data
  },

  addTransaction: async (
    propertyId: string,
    payload: PropertyTransactionCreate,
  ): Promise<PropertyTransactionOut> => {
    const { data } = await apiClient.post<PropertyTransactionOut>(
      `/properties/${propertyId}/transactions`,
      payload,
    )
    return data
  },

  updateTransaction: async (
    propertyId: string,
    txId: string,
    payload: PropertyTransactionUpdate,
  ): Promise<PropertyTransactionOut> => {
    const { data } = await apiClient.put<PropertyTransactionOut>(
      `/properties/${propertyId}/transactions/${txId}`,
      payload,
    )
    return data
  },

  removeTransaction: async (propertyId: string, txId: string): Promise<void> => {
    await apiClient.delete(`/properties/${propertyId}/transactions/${txId}`)
  },

  // Analytics
  getAnalytics: async (propertyId: string, year: number): Promise<PropertyAnalytics> => {
    const { data } = await apiClient.get<PropertyAnalytics>(
      `/properties/${propertyId}/analytics`,
      { params: { year } },
    )
    return data
  },
}
