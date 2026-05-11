import { apiClient } from './client'
import type { ImportResult } from './types'

export const exportImportApi = {
  exportCsv: async (): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>('/export/csv', { responseType: 'blob' })
    return data
  },

  importCsv: async (file: File): Promise<ImportResult> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post<ImportResult>('/import/csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}
