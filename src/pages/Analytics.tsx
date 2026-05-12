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
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

interface ChartRow {
  name: string
  income: number
  expenses: number
  projected: boolean
}

function CustomTooltip({
  active, payload, label, currency,
}: TooltipProps<number, string> & { currency: string }) {
  if (!active || !payload?.length) return null
  const projected = (payload[0]?.payload as ChartRow).projected
  return (
    <div className="bg-card border rounded-lg shadow-md px-3 py-2.5 text-sm min-w-[140px]">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map(p => (
        p.value != null && p.value > 0 ? (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{p.dataKey === 'income' ? 'Income' : 'Expenses'}</span>
            <span className={cn('font-mono font-medium', p.dataKey === 'income' ? 'text-income' : 'text-expense')}>
              {formatAmount(p.value, currency)}
            </span>
          </div>
        ) : null
      ))}
      {projected && <p className="text-xs text-muted-foreground mt-1.5">Projected</p>}
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

  const incomeColor  = useMemo(() => cssVar('--income'),  [theme])
  const expenseColor = useMemo(() => cssVar('--expense'), [theme])
  const mutedColor   = useMemo(() => cssVar('--muted-foreground'), [theme])
  const gridColor    = useMemo(() => cssVar('--border'),  [theme])

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', year, currency],
    queryFn: () => analyticsApi.get(year, currency),
  })

  const chartData = useMemo<ChartRow[]>(() =>
    (data?.months ?? []).map(m => ({
      name:     MONTHS[m.month - 1],
      income:   m.deposit_income      !== null ? Math.round(parseFloat(m.deposit_income)      * 100) / 100 : 0,
      expenses: m.subscription_expenses !== null ? Math.round(parseFloat(m.subscription_expenses) * 100) / 100 : 0,
      projected: m.is_projected,
    })),
    [data],
  )

  const depositsOff     = data?.months.every(m => m.deposit_income       === null) ?? false
  const subscriptionsOff = data?.months.every(m => m.subscription_expenses === null) ?? false
  const hasData = chartData.some(d => d.income > 0 || d.expenses > 0)

  // Summary numbers — actual months only
  const actual = chartData.filter(d => !d.projected)
  const totalIncome   = actual.reduce((s, d) => s + d.income,   0)
  const totalExpenses = actual.reduce((s, d) => s + d.expenses, 0)
  const totalNet      = totalIncome - totalExpenses

  // Projected months
  const projected = chartData.filter(d => d.projected)
  const projIncome   = projected.reduce((s, d) => s + d.income,   0)
  const projExpenses = projected.reduce((s, d) => s + d.expenses, 0)

  const selectCls = 'h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Income vs expenses by month</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year stepper */}
          <div className="flex items-center gap-1 bg-card border rounded-lg h-9 px-1">
            <button
              onClick={() => setYear(y => y - 1)}
              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-sm font-semibold tabular-nums select-none">
              {year}
            </span>
            <button
              onClick={() => setYear(y => y + 1)}
              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Currency selector */}
          <select value={currency} onChange={e => setCurrency(e.target.value)} className={selectCls}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between flex-wrap gap-3">
            <span>{year} · {currency}</span>
            <div className="flex items-center gap-4 text-xs font-normal text-muted-foreground">
              {!depositsOff && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: incomeColor }} />
                  Deposit income
                </span>
              )}
              {!subscriptionsOff && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: expenseColor }} />
                  Sub expenses
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-border" style={{ background: 'transparent', opacity: 0.4 }} />
                Projected
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="h-72 flex items-center justify-center">
              <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
            </div>
          )}
          {error && (
            <div className="h-72 flex items-center justify-center">
              <p className="text-sm text-destructive">Failed to load analytics</p>
            </div>
          )}
          {!isLoading && !error && !hasData && (
            <div className="h-72 flex items-center justify-center flex-col gap-1">
              <p className="text-sm text-muted-foreground">No data for {year} · {currency}</p>
              {(depositsOff || subscriptionsOff) && (
                <p className="text-xs text-muted-foreground">Some modules are disabled in Settings</p>
              )}
            </div>
          )}
          {!isLoading && !error && hasData && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} barCategoryGap="25%" barGap={3}>
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
                  cursor={{ fill: `${gridColor}`, opacity: 0.4 }}
                />

                {/* Deposit income bars */}
                {!depositsOff && (
                  <Bar dataKey="income" radius={[3, 3, 0, 0]} maxBarSize={22}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={incomeColor} fillOpacity={entry.projected ? 0.3 : 1} />
                    ))}
                  </Bar>
                )}

                {/* Subscription expense bars */}
                {!subscriptionsOff && (
                  <Bar dataKey="expenses" radius={[3, 3, 0, 0]} maxBarSize={22}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={expenseColor} fillOpacity={entry.projected ? 0.3 : 1} />
                    ))}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      {!isLoading && !error && hasData && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Income earned</p>
              <p className="text-xl font-bold font-mono mt-1 text-income">
                +{formatAmount(totalIncome, currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                +{formatAmount(projIncome, currency)} projected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Subs spent</p>
              <p className="text-xl font-bold font-mono mt-1 text-expense">
                -{formatAmount(totalExpenses, currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                -{formatAmount(projExpenses, currency)} projected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Net (actual)</p>
              <p className={cn('text-xl font-bold font-mono mt-1', totalNet >= 0 ? 'text-income' : 'text-expense')}>
                {totalNet >= 0 ? '+' : ''}{formatAmount(totalNet, currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">income − expenses</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Net (full year)</p>
              {(() => {
                const yearNet = totalIncome + projIncome - totalExpenses - projExpenses
                return (
                  <>
                    <p className={cn('text-xl font-bold font-mono mt-1', yearNet >= 0 ? 'text-income' : 'text-expense')}>
                      {yearNet >= 0 ? '+' : ''}{formatAmount(yearNet, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">incl. projected</p>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
