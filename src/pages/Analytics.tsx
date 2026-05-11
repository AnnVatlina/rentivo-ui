import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from 'recharts'
import { analyticsApi } from '@/api/analytics'
import { useSettings } from '@/contexts/SettingsContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CURRENCIES } from '@/lib/constants'
import { formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function cssVar(name: string) {
  return `hsl(${getComputedStyle(document.documentElement).getPropertyValue(name).trim()})`
}

function yTickFormatter(value: number): string {
  if (value === 0) return '0'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return String(value)
}

function CustomTooltip({ active, payload, label, currency }: TooltipProps<number, string> & { currency: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  if (d.value == null) return null
  return (
    <div className="bg-card border rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-income font-mono">{formatAmount(d.value, currency)}</p>
      {(payload[0].payload as { projected: boolean }).projected && (
        <p className="text-xs text-muted-foreground mt-0.5">Projected</p>
      )}
    </div>
  )
}

export function Analytics() {
  const { settings } = useSettings()
  const { theme } = useTheme()
  const currentYear = new Date().getFullYear()

  const [year, setYear] = useState(currentYear)
  const [currency, setCurrency] = useState(settings?.default_currency ?? 'USD')

  useEffect(() => {
    if (settings?.default_currency) setCurrency(settings.default_currency)
  }, [settings?.default_currency])

  const primaryColor = useMemo(() => cssVar('--primary'), [theme])
  const mutedColor = useMemo(() => cssVar('--muted-foreground'), [theme])
  const gridColor = useMemo(() => cssVar('--border'), [theme])

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', year, currency],
    queryFn: () => analyticsApi.get(year, currency),
  })

  const chartData = useMemo(() =>
    (data?.months ?? []).map(m => ({
      name: MONTHS[m.month - 1],
      income: m.deposit_income !== null ? Math.round(parseFloat(m.deposit_income) * 100) / 100 : 0,
      projected: m.is_projected,
    })),
    [data]
  )

  const moduleDisabled = data?.months.every(m => m.deposit_income === null) ?? false
  const hasIncome = chartData.some(d => d.income > 0)

  const earnedActual = chartData
    .filter(d => !d.projected)
    .reduce((s, d) => s + d.income, 0)
  const earnedProjected = chartData
    .filter(d => d.projected)
    .reduce((s, d) => s + d.income, 0)
  const bestMonth = [...chartData].sort((a, b) => b.income - a.income)[0]

  const selectCls = 'h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Deposit income by month</p>
        </div>
        <div className="flex gap-2">
          <select value={year} onChange={e => setYear(+e.target.value)} className={selectCls}>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className={selectCls}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Chart card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Deposit income · {year} · {currency}</span>
            <div className="flex items-center gap-4 text-xs font-normal text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ background: primaryColor }} />
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ background: primaryColor, opacity: 0.35 }} />
                Projected
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
            </div>
          )}
          {error && (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-destructive">Failed to load analytics</p>
            </div>
          )}
          {!isLoading && !error && moduleDisabled && (
            <div className="h-64 flex items-center justify-center flex-col gap-2">
              <p className="text-sm text-muted-foreground">Deposits module is disabled</p>
              <p className="text-xs text-muted-foreground">Enable it in Settings → Modules</p>
            </div>
          )}
          {!isLoading && !error && !moduleDisabled && !hasIncome && (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No deposit income in {year} · {currency}</p>
            </div>
          )}
          {!isLoading && !error && !moduleDisabled && hasIncome && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: mutedColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={yTickFormatter}
                  tick={{ fontSize: 12, fill: mutedColor }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  content={<CustomTooltip currency={currency} />}
                  cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                />
                <Bar dataKey="income" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={primaryColor}
                      fillOpacity={entry.projected ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      {!isLoading && hasIncome && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Earned so far</p>
              <p className="text-2xl font-bold font-mono mt-1 text-income">
                {formatAmount(earnedActual, currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">actual months only</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Projected rest</p>
              <p className={cn('text-2xl font-bold font-mono mt-1', earnedProjected > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                {formatAmount(earnedProjected, currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">estimated future income</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Best month</p>
              <p className="text-2xl font-bold font-mono mt-1">
                {bestMonth && bestMonth.income > 0 ? formatAmount(bestMonth.income, currency) : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bestMonth && bestMonth.income > 0 ? bestMonth.name : 'no data'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
