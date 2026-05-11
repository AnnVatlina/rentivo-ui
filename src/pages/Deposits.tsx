import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import { depositsApi } from '@/api/deposits'
import type { DepositOut } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatAmount, formatDate, formatRate } from '@/lib/format'
import { cn } from '@/lib/utils'

type SortKey = 'title' | 'amount' | 'annual_rate' | 'close_date' | 'days_elapsed' | 'income_to_date'
type SortDir = 'asc' | 'desc'

const today = new Date()
today.setHours(0, 0, 0, 0)

function isExpired(d: DepositOut): boolean {
  if (!d.close_date) return false
  return new Date(d.close_date) < today
}

function SortIcon({ col, active, dir }: { col: SortKey; active: SortKey; dir: SortDir }) {
  if (col !== active) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
  return dir === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
    : <ArrowDown className="h-3.5 w-3.5 text-primary" />
}

function sortDeposits(data: DepositOut[], key: SortKey, dir: SortDir): DepositOut[] {
  return [...data].sort((a, b) => {
    let va: string | number = a[key] ?? ''
    let vb: string | number = b[key] ?? ''
    if (key === 'amount' || key === 'annual_rate' || key === 'days_elapsed' || key === 'income_to_date') {
      va = parseFloat(va as string) || 0
      vb = parseFloat(vb as string) || 0
    }
    if (va < vb) return dir === 'asc' ? -1 : 1
    if (va > vb) return dir === 'asc' ? 1 : -1
    return 0
  })
}

export function Deposits() {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['deposits'],
    queryFn: depositsApi.list,
  })

  const sorted = sortDeposits(data, sortKey, sortDir)
  const activeCount = data.filter(d => !isExpired(d)).length
  const expiredCount = data.filter(isExpired).length

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const Th = ({ children, col }: { children: ReactNode; col: SortKey }) => (
    <th
      onClick={() => handleSort(col)}
      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground"
    >
      <div className="flex items-center gap-1.5">
        {children}
        <SortIcon col={col} active={sortKey} dir={sortDir} />
      </div>
    </th>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deposits</h2>
          {!isLoading && data.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="text-income font-medium">{activeCount} active</span>
              {expiredCount > 0 && (
                <span className="text-muted-foreground"> · {expiredCount} expired</span>
              )}
            </p>
          )}
        </div>
        <Button onClick={() => navigate('/deposits/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add deposit
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading…</p>
      )}
      {error && (
        <p className="text-sm text-destructive py-8 text-center">Failed to load deposits</p>
      )}

      {!isLoading && !error && (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead className="border-b bg-muted/30">
              <tr>
                <Th col="title">Title</Th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bank</th>
                <Th col="amount">Amount</Th>
                <Th col="annual_rate">Rate</Th>
                <Th col="close_date">Close date</Th>
                <Th col="days_elapsed">Days</Th>
                <Th col="income_to_date">Accrued income</Th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-muted-foreground">
                    No deposits yet.{' '}
                    <button onClick={() => navigate('/deposits/new')} className="text-primary hover:underline">
                      Add your first deposit
                    </button>
                  </td>
                </tr>
              ) : (
                sorted.map(d => {
                  const expired = isExpired(d)
                  return (
                    <tr
                      key={d.id}
                      className={cn(
                        'border-t transition-colors',
                        expired
                          ? 'bg-muted/20 hover:bg-muted/30'
                          : 'hover:bg-muted/20',
                      )}
                    >
                      {/* Title + status dot */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full shrink-0',
                              expired ? 'bg-muted-foreground/40' : 'bg-income',
                            )}
                          />
                          <span className={cn('font-medium', expired && 'text-muted-foreground')}>
                            {d.title}
                          </span>
                        </div>
                      </td>

                      {/* Bank */}
                      <td className={cn('px-4 py-3', expired ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
                        {d.bank_name || '—'}
                      </td>

                      {/* Amount */}
                      <td className={cn('px-4 py-3 font-mono font-medium', expired && 'text-muted-foreground')}>
                        {formatAmount(d.amount, d.currency)}
                      </td>

                      {/* Rate + type badge */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('font-mono', expired && 'text-muted-foreground')}>
                            {formatRate(d.annual_rate)}
                          </span>
                          <Badge
                            variant={d.interest_type === 'compound' ? 'default' : 'secondary'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {d.interest_type === 'compound'
                              ? (d.compound_frequency ?? 'compound')
                              : 'simple'}
                          </Badge>
                        </div>
                      </td>

                      {/* Close date */}
                      <td className="px-4 py-3">
                        {d.close_date ? (
                          <div className="flex items-center gap-2">
                            <span className={cn(expired ? 'text-muted-foreground' : 'text-foreground')}>
                              {formatDate(d.close_date)}
                            </span>
                            {expired && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                                Expired
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Open-ended</span>
                        )}
                      </td>

                      {/* Days */}
                      <td className={cn('px-4 py-3 font-mono', expired ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
                        {d.days_elapsed}d
                      </td>

                      {/* Accrued income */}
                      <td className={cn(
                        'px-4 py-3 font-mono font-semibold',
                        expired ? 'text-muted-foreground' : 'text-income',
                      )}>
                        +{formatAmount(d.income_to_date, d.currency)}
                      </td>

                      {/* Edit button */}
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/deposits/${d.id}`)}
                          className="h-7 w-7"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
