import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import { depositsApi } from '@/api/deposits'
import type { DepositOut } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pagination, paginate } from '@/components/ui/pagination'
import { formatAmount, formatDate, formatRate } from '@/lib/format'
import { cn } from '@/lib/utils'

const PER_PAGE = 10

type SortKey = 'title' | 'amount' | 'annual_rate' | 'close_date' | 'days_elapsed' | 'income_to_date'
type SortDir = 'asc' | 'desc'

const EXPIRING_SOON_DAYS = 30

const today = new Date()
today.setHours(0, 0, 0, 0)

type DepositStatus = 'active' | 'expiring' | 'expired'

function depositStatus(d: DepositOut): DepositStatus {
  if (!d.close_date) return 'active'
  const close = new Date(d.close_date)
  if (close < today) return 'expired'
  const daysLeft = Math.ceil((close.getTime() - today.getTime()) / 86_400_000)
  if (daysLeft <= EXPIRING_SOON_DAYS) return 'expiring'
  return 'active'
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86_400_000)
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
  const [page, setPage] = useState(1)

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['deposits'],
    queryFn: depositsApi.list,
  })

  const sorted = sortDeposits(data, sortKey, sortDir)
  const counts = { active: 0, expiring: 0, expired: 0 }
  data.forEach(d => counts[depositStatus(d)]++)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const paged = paginate(sorted, page, PER_PAGE)

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
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
              <span className="text-income font-medium">{counts.active} active</span>
              {counts.expiring > 0 && (
                <span className="text-amber-600 font-medium">{counts.expiring} expiring soon</span>
              )}
              {counts.expired > 0 && (
                <span className="text-muted-foreground">{counts.expired} expired</span>
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
                paged.map(d => {
                  const status = depositStatus(d)
                  const expired = status === 'expired'
                  const expiring = status === 'expiring'

                  return (
                    <tr
                      key={d.id}
                      className={cn(
                        'border-t transition-colors',
                        expired  && 'bg-muted/20 hover:bg-muted/30',
                        expiring && 'bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
                        !expired && !expiring && 'hover:bg-muted/20',
                      )}
                    >
                      {/* Title + status dot */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'h-2 w-2 rounded-full shrink-0',
                            expired  ? 'bg-muted-foreground/40' :
                            expiring ? 'bg-amber-500' :
                                       'bg-income',
                          )} />
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
                            {expiring && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                                {daysUntil(d.close_date)}d left
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Open-ended</span>
                        )}
                      </td>

                      {/* Days elapsed */}
                      <td className={cn('px-4 py-3 font-mono', expired ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
                        {d.days_elapsed}d
                      </td>

                      {/* Accrued income */}
                      <td className={cn(
                        'px-4 py-3 font-mono font-semibold',
                        expired  ? 'text-muted-foreground' :
                        expiring ? 'text-amber-600' :
                                   'text-income',
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
          <Pagination total={sorted.length} page={page} perPage={PER_PAGE} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
