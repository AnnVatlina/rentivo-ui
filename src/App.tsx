import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Dashboard } from '@/pages/Dashboard'
import { Deposits } from '@/pages/Deposits'
import { DepositForm } from '@/pages/DepositForm'
import { Subscriptions } from '@/pages/Subscriptions'
import { Properties } from '@/pages/Properties'
import { Analytics } from '@/pages/Analytics'
import { ImportExport } from '@/pages/ImportExport'
import { SettingsPage } from '@/pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <SettingsProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="deposits" element={<Deposits />} />
                <Route path="deposits/new" element={<DepositForm />} />
                <Route path="deposits/:id" element={<DepositForm />} />
                <Route path="subscriptions/*" element={<Subscriptions />} />
                <Route path="properties/*" element={<Properties />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="import-export" element={<ImportExport />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SettingsProvider>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
