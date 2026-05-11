import { apiClient } from './client'
import type { UserSettings, UserSettingsUpdate, DemoDataResult, DeleteDataResult } from './types'

export const settingsApi = {
  get: async (): Promise<UserSettings> => {
    const { data } = await apiClient.get<UserSettings>('/settings')
    return data
  },

  update: async (payload: UserSettingsUpdate): Promise<UserSettings> => {
    const { data } = await apiClient.put<UserSettings>('/settings', payload)
    return data
  },

  loadDemoData: async (): Promise<DemoDataResult> => {
    const { data } = await apiClient.post<DemoDataResult>('/settings/demo-data')
    return data
  },

  deleteAllData: async (): Promise<DeleteDataResult> => {
    const { data } = await apiClient.delete<DeleteDataResult>('/settings/data')
    return data
  },
}
