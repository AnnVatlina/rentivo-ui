import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Landmark,
  CreditCard,
  Building2,
  BarChart3,
  FolderInput,
  Settings,
  LogOut,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  visible: boolean
}

export function Layout() {
  const { logout } = useAuth()
  const { settings } = useSettings()

  const nav: NavItem[] = [
    {
      to: '/',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      visible: true,
    },
    {
      to: '/deposits',
      label: 'Deposits',
      icon: <Landmark className="h-4 w-4" />,
      visible: settings?.module_deposits !== false,
    },
    {
      to: '/subscriptions',
      label: 'Subscriptions',
      icon: <CreditCard className="h-4 w-4" />,
      visible: settings?.module_subscriptions !== false,
    },
    {
      to: '/properties',
      label: 'Properties',
      icon: <Building2 className="h-4 w-4" />,
      visible: !!settings?.module_property,
    },
    {
      to: '/analytics',
      label: 'Analytics',
      icon: <BarChart3 className="h-4 w-4" />,
      visible: true,
    },
    {
      to: '/import-export',
      label: 'Import / Export',
      icon: <FolderInput className="h-4 w-4" />,
      visible: true,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4" />,
      visible: true,
    },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-indigo-700 text-white flex flex-col">
        <div className="px-5 py-5">
          <h1 className="text-xl font-bold tracking-tight">Rentivo</h1>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {nav
            .filter((item) => item.visible)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-indigo-100 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start gap-3 text-indigo-100 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
