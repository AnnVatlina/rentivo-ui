import { apiClient } from './client'
import type { SubscriptionOut, SubscriptionCreate, SubscriptionUpdate } from './types'

export const subscriptionsApi = {
  list: async (): Promise<SubscriptionOut[]> => {
    const { data } = await apiClient.get<SubscriptionOut[]>('/subscriptions')
    return data
  },

  get: async (id: string): Promise<SubscriptionOut> => {
    const { data } = await apiClient.get<SubscriptionOut>(`/subscriptions/${id}`)
    return data
  },

  create: async (payload: SubscriptionCreate): Promise<SubscriptionOut> => {
    const { data } = await apiClient.post<SubscriptionOut>('/subscriptions', payload)
    return data
  },

  update: async (id: string, payload: SubscriptionUpdate): Promise<SubscriptionOut> => {
    const { data } = await apiClient.put<SubscriptionOut>(`/subscriptions/${id}`, payload)
    return data
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/subscriptions/${id}`)
  },
}
