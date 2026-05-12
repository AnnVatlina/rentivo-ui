import { useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Plus, Trash2, TrendingUp, TrendingDown, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { propertiesApi } from '@/api/properties'
import { useSettings } from '@/contexts/SettingsContext'
import type {
  PropertyTransactionOut,
  PropertyTransactionCreate,
  TransactionType,
  TransactionBillingCycle,
} from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination, paginate } from '@/components/ui/pagination'
import { CURRENCIES } from '@/lib/constants'
import { formatAmount, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const PER_PAGE = 20

const SEL = 'h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const FIELD = 'flex flex-col gap-1.5'
const ERR = 'text-xs text-destructive'

const CYCLE_LABELS: Record<string, string> = {
  one_time: 'One-time', monthly: 'Monthly', weekly: 'Weekly',
  quarterly: 'Quarterly', yearly: 'Yearly',
}

const CATEGORIES = ['utilities', 'maintenance', 'mortgage', 'tax', 'rent', 'other'] as const
type Category = typeof CATEGORIES[number]

type TypeFilter = 'all' | 'income' | 'expense'
type CatFilter = 'all' | Category
type SortKey = 'category' | 'title' | 'amount' | 'billing_cycle' | 'date'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, active, dir }: { col: SortKey; active: SortKey; dir: SortDir }) {
  if (col !== active) return <ArrowUpDown className="h-3 w-3 opacity-40" />
  return dir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-primary" />
    : <ArrowDown className="h-3 w-3 text-primary" />
}

// ── Transaction form ──────────────────────────────────────────────────────────

const txSchema = z.object({
  type:             z.enum(['income', 'expense']),
  category:         z.string().min(1, 'Required'),
  title:            z.string().min(1, 'Required'),
  amount:           z.string().refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Must be positive'),
  currency:         z.string(),
  billing_cycle:    z.enum(['one_time', 'monthly', 'weekly', 'quarterly', 'yearly']),
  transaction_date: z.string().optional(),
  start_date:       z.string().optional(),
  end_date:         z.string().optional(),
})
type TxForm = z.infer<typeof txSchema>

function TransactionForm({
  propCurrency,
  initial,
  onSave,
  onCancel,
  saving,
}: {
  propCurrency: string
  initial?: PropertyTransactionOut
  onSave: (data: TxForm) => void
  onCancel: () => void
  saving: boolean
}) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: initial ? {
      type:             initial.type,
      category:         initial.category,
      title:            initial.title,
      amount:           initial.amount,
      currency:         initial.currency,
      billing_cycle:    initial.billing_cycle,
      transaction_date: initial.transaction_date ?? '',
      start_date:       initial.start_date ?? '',
      end_date:         initial.end_date ?? '',
    } : {
      type: 'expense',
      currency: propCurrency,
      billing_cycle: 'one_time',
    },
  })

  const cycle = useWatch({ control, name: 'billing_cycle' })
  const isOneTime = cycle === 'one_time'

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3 p-4 bg-muted/20 rounded-lg border" noValidate>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={FIELD}>
          <Label>Type</Label>
          <select className={SEL} {...register('type')}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div className={FIELD}>
          <Label>Category *</Label>
          <select className={SEL} {...register('category')}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          {errors.category && <p className={ERR}>{errors.category.message}</p>}
        </div>
        <div className={FIELD}>
          <Label>Billing cycle</Label>
          <select className={SEL} {...register('billing_cycle')}>
            {Object.entries(CYCLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className={FIELD}>
          <Label>{isOneTime ? 'Date' : 'Start date'}</Label>
          <Input type="date" {...register(isOneTime ? 'transaction_date' : 'start_date')} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${FIELD} col-span-2`}>
          <Label>Title *</Label>
          <Input placeholder="Electricity, monthly rent…" {...register('title')} />
          {errors.title && <p className={ERR}>{errors.title.message}</p>}
        </div>
        <div className={FIELD}>
          <Label>Amount *</Label>
          <Input type="number" step="0.01" min="0" {...register('amount')} />
          {errors.amount && <p className={ERR}>{errors.amount.message}</p>}
        </div>
        <div className={FIELD}>
          <Label>Currency</Label>
          <select className={SEL} {...register('currency')}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {!isOneTime && (
        <div className={`${FIELD} max-w-xs`}>
          <Label>End date <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input type="date" {...register('end_date')} />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Update' : 'Add transaction'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

// ── Transaction row ───────────────────────────────────────────────────────────

function TxRow({
  tx,
  baseCurrency,
  onEdit,
  onDelete,
}: {
  tx: PropertyTransactionOut
  baseCurrency: string
  onEdit: (tx: PropertyTransactionOut) => void
  onDelete: (id: string) => void
}) {
  const isIncome = tx.type === 'income'
  const dateStr = tx.billing_cycle === 'one_time'
    ? formatDate(tx.transaction_date)
    : tx.start_date ? `from ${formatDate(tx.start_date)}` : '—'
  const inBase = tx.currency === baseCurrency

  return (
    <tr className="border-t hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        {isIncome
          ? <TrendingUp className="h-4 w-4 text-income" />
          : <TrendingDown className="h-4 w-4 text-expense" />}
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs capitalize">{tx.category}</td>
      <td className="px-4 py-3 font-medium">{tx.title}</td>
      <td className="px-4 py-3 text-right font-mono font-medium">
        <span className={isIncome ? 'text-income' : 'text-expense'}>
          {isIncome ? '+' : '−'}{formatAmount(tx.amount, tx.currency)}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
        {inBase ? (
          <span className={isIncome ? 'text-income/70' : 'text-expense/70'}>
            {isIncome ? '+' : '−'}{formatAmount(tx.amount, baseCurrency)}
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
          {CYCLE_LABELS[tx.billing_cycle]}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs">{dateStr}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tx)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(tx.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editingTx, setEditingTx] = useState<PropertyTransactionOut | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [txSaving, setTxSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [catFilter, setCatFilter] = useState<CatFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const { settings } = useSettings()
  const defaultCurrency = settings?.default_currency ?? 'USD'

  const { data: property, isLoading: loadingProp } = useQuery({
    queryKey: ['property', id],
    queryFn: () => propertiesApi.get(id!),
    enabled: !!id,
  })

  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ['property', id, 'transactions'],
    queryFn: () => propertiesApi.listTransactions(id!),
    enabled: !!id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['property', id] })
    queryClient.invalidateQueries({ queryKey: ['property', id, 'transactions'] })
    queryClient.invalidateQueries({ queryKey: ['properties'] })
  }

  const saveTx = async (data: TxForm) => {
    setTxSaving(true)
    try {
      const payload: PropertyTransactionCreate = {
        type:             data.type as TransactionType,
        category:         data.category,
        title:            data.title,
        amount:           data.amount,
        currency:         data.currency,
        billing_cycle:    data.billing_cycle as TransactionBillingCycle,
        transaction_date: data.billing_cycle === 'one_time' ? data.transaction_date || undefined : undefined,
        start_date:       data.billing_cycle !== 'one_time' ? data.start_date || undefined : undefined,
        end_date:         data.billing_cycle !== 'one_time' ? data.end_date || undefined : undefined,
      }
      if (editingTx) {
        await propertiesApi.updateTransaction(id!, editingTx.id, payload)
        toast.success('Transaction updated')
      } else {
        await propertiesApi.addTransaction(id!, payload)
        toast.success('Transaction added')
      }
      invalidate()
      setEditingTx(null)
      setShowAddForm(false)
      setPage(1)
    } catch {
      toast.error('Failed to save transaction')
    } finally {
      setTxSaving(false)
    }
  }

  const deleteTx = async (txId: string) => {
    if (!confirm('Delete this transaction?')) return
    try {
      await propertiesApi.removeTransaction(id!, txId)
      invalidate()
      toast.success('Transaction deleted')
    } catch {
      toast.error('Failed to delete transaction')
    }
  }

  const resetFilters = () => { setTypeFilter('all'); setCatFilter('all'); setPage(1) }

  if (loadingProp) {
    return <p className="text-sm text-muted-foreground animate-pulse py-8">Loading…</p>
  }
  if (!property) {
    return <p className="text-sm text-destructive py-8">Property not found</p>
  }

  const currency = property.currency
  const summary = property.summary

  // Totals
  const expenseTotal = transactions
    .filter(t => t.type === 'expense' && t.currency === currency)
    .reduce((s, t) => s + parseFloat(t.amount), 0)
  const incomeTotal = transactions
    .filter(t => t.type === 'income' && t.currency === currency)
    .reduce((s, t) => s + parseFloat(t.amount), 0)

  // Sort
  const sorted = [...transactions].sort((a, b) => {
    let va: string | number
    let vb: string | number
    if (sortKey === 'date') {
      va = (a.billing_cycle === 'one_time' ? a.transaction_date : a.start_date) ?? ''
      vb = (b.billing_cycle === 'one_time' ? b.transaction_date : b.start_date) ?? ''
    } else if (sortKey === 'amount') {
      va = parseFloat(a.amount)
      vb = parseFloat(b.amount)
    } else if (sortKey === 'billing_cycle') {
      va = a.billing_cycle
      vb = b.billing_cycle
    } else {
      va = a[sortKey] ?? ''
      vb = b[sortKey] ?? ''
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  // Filter
  const filtered = sorted.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (catFilter !== 'all' && t.category !== catFilter) return false
    return true
  })

  const paged = paginate(filtered, page, PER_PAGE)

  // Totals for ALL filtered rows (not just current page)
  function sumFiltered(type: 'expense' | 'income', cur?: string) {
    return filtered
      .filter(t => t.type === type && (cur ? t.currency === cur : true))
      .reduce((s, t) => s + parseFloat(t.amount), 0)
  }
  const totalExpense     = sumFiltered('expense')
  const totalIncome      = sumFiltered('income')
  const baseExpense      = sumFiltered('expense', defaultCurrency)
  const baseIncome       = sumFiltered('income',  defaultCurrency)
  const hasMultiCurrency = filtered.some(t => t.currency !== defaultCurrency)

  // Category counts for filter chips
  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c] = transactions.filter(t => t.category === c && (typeFilter === 'all' || t.type === typeFilter)).length
    return acc
  }, {} as Record<string, number>)

  const Th = ({ children, col, right }: { children: ReactNode; col: SortKey; right?: boolean }) => (
    <th
      onClick={() => handleSort(col)}
      className={cn(
        'px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-foreground',
        right ? 'text-right' : 'text-left',
      )}
    >
      <div className={cn('flex items-center gap-1', right && 'justify-end')}>
        {children}
        <SortIcon col={col} active={sortKey} dir={sortDir} />
      </div>
    </th>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/properties')} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{property.name}</h2>
            {property.address && (
              <p className="text-sm text-muted-foreground mt-0.5">{property.address}</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/properties/${id}/edit`)}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit property
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Total invested</p>
            <p className="text-xl font-bold font-mono mt-1">
              {summary ? formatAmount(summary.total_invested, currency) : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">purchase + one-time expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Expenses</p>
            <p className="text-xl font-bold font-mono mt-1 text-expense">
              −{formatAmount(expenseTotal, currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {transactions.filter(t => t.type === 'expense').length} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Income received</p>
            <p className="text-xl font-bold font-mono mt-1 text-income">
              +{formatAmount(incomeTotal, currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {transactions.filter(t => t.type === 'income').length} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              {property.status === 'sold' ? 'Profit' : 'Status'}
            </p>
            {property.status === 'sold' && summary?.profit != null ? (
              <p className={cn(
                'text-xl font-bold font-mono mt-1',
                parseFloat(summary.profit) >= 0 ? 'text-income' : 'text-expense',
              )}>
                {parseFloat(summary.profit) >= 0 ? '+' : ''}{formatAmount(summary.profit, currency)}
              </p>
            ) : (
              <div className="mt-1">
                <Badge variant="default">Active</Badge>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {property.status === 'sold' ? 'sale price − total invested' : 'not sold yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add form */}
      {(showAddForm || editingTx) && (
        <TransactionForm
          propCurrency={currency}
          initial={editingTx ?? undefined}
          onSave={saveTx}
          onCancel={() => { setShowAddForm(false); setEditingTx(null) }}
          saving={txSaving}
        />
      )}

      {/* Transactions table */}
      <div className="bg-card rounded-xl border overflow-x-auto">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b">
          {/* Type filter */}
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
            {(['all', 'expense', 'income'] as TypeFilter[]).map(f => (
              <button
                key={f}
                onClick={() => { setTypeFilter(f); setPage(1) }}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors capitalize',
                  typeFilter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {f === 'all' ? `All (${transactions.length})` : f === 'expense'
                  ? `Expenses (${transactions.filter(t => t.type === 'expense').length})`
                  : `Income (${transactions.filter(t => t.type === 'income').length})`}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => { setCatFilter('all'); setPage(1) }}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                catFilter === 'all'
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground',
              )}
            >
              All categories
            </button>
            {CATEGORIES.filter(c => catCounts[c] > 0).map(c => (
              <button
                key={c}
                onClick={() => { setCatFilter(c); setPage(1) }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors capitalize',
                  catFilter === c
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground',
                )}
              >
                {c} ({catCounts[c]})
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {(typeFilter !== 'all' || catFilter !== 'all') && (
              <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="h-3 w-3" /> Reset
              </button>
            )}
            {!showAddForm && !editingTx && (
              <Button size="sm" variant="outline" onClick={() => { setShowAddForm(true); setPage(1) }}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add
              </Button>
            )}
            {(showAddForm || editingTx) && (
              <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setEditingTx(null) }}>
                <X className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {loadingTx ? (
          <p className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">
            No transactions yet.{' '}
            <button className="text-primary hover:underline" onClick={() => setShowAddForm(true)}>
              Add the first one
            </button>
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No transactions match the filter.{' '}
            <button className="text-primary hover:underline" onClick={resetFilters}>Reset filters</button>
          </p>
        ) : (
          <>
            <table className="w-full text-sm min-w-max">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 w-8" />
                  <Th col="category">Category</Th>
                  <Th col="title">Title</Th>
                  <Th col="amount" right>Amount</Th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {defaultCurrency}
                  </th>
                  <Th col="billing_cycle">Cycle</Th>
                  <Th col="date">Date</Th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {paged.map(tx => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    baseCurrency={defaultCurrency}
                    onEdit={t => { setEditingTx(t); setShowAddForm(false) }}
                    onDelete={deleteTx}
                  />
                ))}
              </tbody>
              <tfoot className="border-t-2 bg-muted/20">
                {(typeFilter !== 'income') && totalExpense > 0 && (
                  <tr>
                    <td className="px-4 py-2.5">
                      <TrendingDown className="h-4 w-4 text-expense/60" />
                    </td>
                    <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Total expenses ({filtered.filter(t => t.type === 'expense').length})
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-expense">
                      −{formatAmount(totalExpense, currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-expense/70">
                      {hasMultiCurrency ? `−${formatAmount(baseExpense, defaultCurrency)}` : ''}
                    </td>
                    <td colSpan={3} />
                  </tr>
                )}
                {(typeFilter !== 'expense') && totalIncome > 0 && (
                  <tr>
                    <td className="px-4 py-2.5">
                      <TrendingUp className="h-4 w-4 text-income/60" />
                    </td>
                    <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Total income ({filtered.filter(t => t.type === 'income').length})
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-income">
                      +{formatAmount(totalIncome, currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-income/70">
                      {hasMultiCurrency ? `+${formatAmount(baseIncome, defaultCurrency)}` : ''}
                    </td>
                    <td colSpan={3} />
                  </tr>
                )}
              </tfoot>
            </table>
            <div className="px-4 py-2">
              <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
