import axios from 'axios'
import type { TokenPair } from './types'
import { setAccessToken, apiClient } from './client'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function register(email: string, password: string): Promise<TokenPair> {
  const { data } = await axios.post<TokenPair>(`${BASE_URL}/auth/register`, { email, password })
  setAccessToken(data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return data
}

export async function login(email: string, password: string): Promise<TokenPair> {
  const { data } = await axios.post<TokenPair>(`${BASE_URL}/auth/login`, { email, password })
  setAccessToken(data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return data
}

export async function refreshTokens(): Promise<TokenPair> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) throw new Error('No refresh token')
  const { data } = await axios.post<TokenPair>(`${BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  })
  setAccessToken(data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return data
}

export function logout() {
  setAccessToken(null)
  localStorage.removeItem('refresh_token')
}

export async function getMe() {
  const { data } = await apiClient.get('/auth/me')
  return data
}
