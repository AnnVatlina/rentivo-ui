import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import { subscriptionsApi } from '@/api/subscriptions'
import type { SubscriptionOut } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pagination, paginate } from '@/components/ui/pagination'
import { formatAmount, formatDate } from '@/lib/format'
import { BILLING_CYCLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const PER_PAGE = 10

type Filter = 'all' | 'active' | 'one_time' | 'inactive'

const TABS: { id: Filter; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'active',   label: 'Active' },
  { id: 'one_time', label: 'One-time' },
  { id: 'inactive', label: 'Cancelled' },
]

function applyFilter(items: SubscriptionOut[], filter: Filter): SubscriptionOut[] {
  switch (filter) {
    case 'active':   return items.filter(s => s.is_active && s.billing_cycle !== 'one_time')
    case 'one_time': return items.filter(s => s.billing_cycle === 'one_time')
    case 'inactive': return items.filter(s => !s.is_active)
    default:         return items
  }
}

const now = new Date()
const thisYear  = now.getFullYear()
const thisMonth = now.getMonth()

function isPaymentThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  return d.getFullYear() === thisYear && d.getMonth() === thisMonth
}

function NextPayment({ sub }: { sub: SubscriptionOut }) {
  if (!sub.is_active || sub.billing_cycle === 'one_time') {
    return <span className="text-muted-foreground text-xs">—</span>
  }
  if (!sub.next_payment_date) {
    return <span className="text-muted-foreground text-xs">—</span>
  }
  const days = Math.ceil(
    (new Date(sub.next_payment_date).getTime() - now.getTime()) / 86_400_000,
  )
  const thisMonth = isPaymentThisMonth(sub.next_payment_date)
  return (
    <div className="flex items-center gap-1.5">
      <span>{formatDate(sub.next_payment_date)}</span>
      {days >= 0 && days <= 7 ? (
        <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
          {days === 0 ? 'today' : `${days}d`}
        </Badge>
      ) : thisMonth && days >= 0 ? (
        <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
          this month
        </Badge>
      ) : null}
    </div>
  )
}

export function Subscriptions() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: subscriptionsApi.list,
  })

  const filtered = applyFilter(data, filter)
  const paged = paginate(filtered, page, PER_PAGE)

  const counts: Record<Filter, number> = {
    all:      data.length,
    active:   data.filter(s => s.is_active && s.billing_cycle !== 'one_time').length,
    one_time: data.filter(s => s.billing_cycle === 'one_time').length,
    inactive: data.filter(s => !s.is_active).length,
  }

  const totalMonthly = data
    .filter(s => s.is_active && s.billing_cycle === 'monthly')
    .reduce((sum, s) => sum + parseFloat(s.amount), 0)

  const dueThisMonth = data.filter(
    s => s.is_active && s.billing_cycle !== 'one_time' &&
         s.next_payment_date && isPaymentThisMonth(s.next_payment_date),
  )

  const Th = ({ children, right }: { children: ReactNode; right?: boolean }) => (
    <th className={cn(
      'px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide',
      right ? 'text-right' : 'text-left',
    )}>
      {children}
    </th>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Subscriptions</h2>
          {!isLoading && data.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>{counts.active} active ·{' '}
                <span className="text-expense font-medium">
                  {formatAmount(totalMonthly, data.find(s => s.is_active)?.currency ?? 'USD')} / mo
                </span>
              </span>
              {dueThisMonth.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
                  {dueThisMonth.length} payment{dueThisMonth.length > 1 ? 's' : ''} this month
                </span>
              )}
            </p>
          )}
        </div>
        <Button onClick={() => navigate('/subscriptions/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add subscription
        </Button>
      </div>

      {/* Filter tabs */}
      {!isLoading && data.length > 0 && (
        <div className="flex gap-1 bg-card border rounded-lg p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setFilter(tab.id); setPage(1) }}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                filter === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {tab.label}
              {counts[tab.id] > 0 && (
                <span className={cn(
                  'ml-1.5 text-xs',
                  filter === tab.id ? 'opacity-80' : 'opacity-60',
                )}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading…</p>
      )}
      {error && (
        <p className="text-sm text-destructive py-8 text-center">Failed to load subscriptions</p>
      )}

      {!isLoading && !error && (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead className="border-b bg-muted/30">
              <tr>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Cycle</Th>
                <Th right>Amount</Th>
                <Th right>Monthly</Th>
                <Th>Next payment</Th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    {data.length === 0 ? (
                      <>
                        No subscriptions yet.{' '}
                        <button
                          onClick={() => navigate('/subscriptions/new')}
                          className="text-primary hover:underline"
                        >
                          Add your first
                        </button>
                      </>
                    ) : (
                      `No ${filter === 'inactive' ? 'cancelled' : filter} subscriptions`
                    )}
                  </td>
                </tr>
              ) : (
                paged.map(s => (
                  <tr
                    key={s.id}
                    className={cn(
                      'border-t transition-colors',
                      !s.is_active
                        ? 'bg-muted/20 hover:bg-muted/30'
                        : 'hover:bg-muted/20',
                    )}
                  >
                    {/* Title + status dot */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          s.is_active ? 'bg-income' : 'bg-muted-foreground/40',
                        )} />
                        <span className={cn('font-medium', !s.is_active && 'text-muted-foreground')}>
                          {s.title}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.category || '—'}
                    </td>

                    {/* Billing cycle */}
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                        {BILLING_CYCLE_LABELS[s.billing_cycle] ?? s.billing_cycle}
                      </Badge>
                    </td>

                    {/* Amount */}
                    <td className={cn('px-4 py-3 text-right font-mono', !s.is_active && 'text-muted-foreground')}>
                      {formatAmount(s.amount, s.currency)}
                    </td>

                    {/* Monthly cost */}
                    <td className={cn(
                      'px-4 py-3 text-right font-mono font-medium',
                      s.billing_cycle === 'one_time'
                        ? 'text-muted-foreground'
                        : s.is_active ? 'text-expense' : 'text-muted-foreground',
                    )}>
                      {s.billing_cycle === 'one_time'
                        ? '—'
                        : formatAmount(s.monthly_cost, s.currency)}
                    </td>

                    {/* Next payment */}
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      <NextPayment sub={s} />
                    </td>

                    {/* Edit */}
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/subscriptions/${s.id}`)}
                        className="h-7 w-7"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
