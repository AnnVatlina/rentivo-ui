import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Building2, Pencil, Settings2 } from 'lucide-react'
import { propertiesApi } from '@/api/properties'
import { useSettings } from '@/contexts/SettingsContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatAmount, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export function Properties() {
  const navigate = useNavigate()
  const { settings } = useSettings()

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['properties'],
    queryFn: propertiesApi.list,
    enabled: !!settings?.module_property,
  })

  // Module disabled
  if (settings && !settings.module_property) {
    return (
      <div className="max-w-lg">
        <h2 className="text-2xl font-bold mb-1">Properties</h2>
        <Card className="mt-6">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">Property module is disabled</p>
            <p className="text-sm text-muted-foreground">
              Enable it in Settings → Modules to track real estate investments.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')} className="mt-1">
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Properties</h2>
          {!isLoading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.length} {data.length === 1 ? 'property' : 'properties'}
              {data.filter(p => p.status === 'active').length > 0 && (
                <> · {data.filter(p => p.status === 'active').length} active</>
              )}
            </p>
          )}
        </div>
        <Button onClick={() => navigate('/properties/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add property
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading…</p>
      )}
      {error && (
        <p className="text-sm text-destructive py-8 text-center">Failed to load properties</p>
      )}

      {!isLoading && !error && (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead className="border-b bg-muted/30">
              <tr>
                {['Name', 'Address', 'Purchased', 'Price', 'Status', ''].map(h => (
                  <th key={h} className={cn(
                    'px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide',
                    h === 'Price' ? 'text-right' : 'text-left',
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    No properties yet.{' '}
                    <button onClick={() => navigate('/properties/new')} className="text-primary hover:underline">
                      Add your first
                    </button>
                  </td>
                </tr>
              ) : (
                data.map(p => (
                  <tr
                    key={p.id}
                    className="border-t hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/properties/${p.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.address || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {formatAmount(p.purchase_price, p.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                        {p.status === 'active' ? 'Active' : 'Sold'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={e => { e.stopPropagation(); navigate(`/properties/${p.id}/edit`) }}>
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
