import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Access token lives in module memory — never in localStorage (XSS-safe)
let _accessToken: string | null = null

export const setAccessToken = (token: string | null) => {
  _accessToken = token
}

export const getAccessToken = () => _accessToken

export const apiClient = axios.create({
  baseURL: BASE_URL,
})

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`
  }
  return config
})

// Refresh token logic — one in-flight promise shared across concurrent 401s
let _refreshPromise: Promise<string> | null = null

async function attemptRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) throw new Error('No refresh token')

  const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
    `${BASE_URL}/auth/refresh`,
    { refresh_token: refreshToken },
  )

  setAccessToken(data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return data.access_token
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    // Only retry once; skip refresh endpoint itself to avoid loops
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true
      try {
        if (!_refreshPromise) {
          _refreshPromise = attemptRefresh().finally(() => {
            _refreshPromise = null
          })
        }
        const newToken = await _refreshPromise
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)
      } catch {
        // Refresh failed — clear tokens and let the caller handle the 401
        setAccessToken(null)
        localStorage.removeItem('refresh_token')
      }
    }
    return Promise.reject(error)
  },
)
