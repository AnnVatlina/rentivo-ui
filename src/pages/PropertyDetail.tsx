import { useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Plus, Trash2, TrendingUp, TrendingDown, X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { propertiesApi } from '@/api/properties'
import type {
  PropertyTransactionOut,
  PropertyTransactionCreate,
  TransactionType,
  TransactionBillingCycle,
} from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div className="grid grid-cols-2 gap-3">
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
            <option value="utilities">Utilities</option>
            <option value="maintenance">Maintenance</option>
            <option value="mortgage">Mortgage</option>
            <option value="tax">Tax</option>
            <option value="rent">Rent</option>
            <option value="other">Other</option>
          </select>
          {errors.category && <p className={ERR}>{errors.category.message}</p>}
        </div>
      </div>

      <div className={FIELD}>
        <Label>Title *</Label>
        <Input placeholder="Electricity, monthly rent…" {...register('title')} />
        {errors.title && <p className={ERR}>{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className={`${FIELD} col-span-2`}>
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

      <div className="grid grid-cols-2 gap-3">
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

      {!isOneTime && (
        <div className={FIELD}>
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
  onEdit,
  onDelete,
}: {
  tx: PropertyTransactionOut
  onEdit: (tx: PropertyTransactionOut) => void
  onDelete: (id: string) => void
}) {
  const isIncome = tx.type === 'income'
  const dateStr = tx.billing_cycle === 'one_time'
    ? formatDate(tx.transaction_date)
    : tx.start_date ? `from ${formatDate(tx.start_date)}` : '—'

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

  if (loadingProp) {
    return <p className="text-sm text-muted-foreground animate-pulse py-8">Loading…</p>
  }
  if (!property) {
    return <p className="text-sm text-destructive py-8">Property not found</p>
  }

  const summary = property.summary
  const propCurrency = property.currency
  const incomeTotal = transactions
    .filter(t => t.type === 'income' && t.currency === propCurrency)
    .reduce((s, t) => s + parseFloat(t.amount), 0)

  // Sort: newest first (one_time by transaction_date, recurring by start_date)
  const sorted = [...transactions].sort((a, b) => {
    const da = a.billing_cycle === 'one_time' ? a.transaction_date : a.start_date
    const db = b.billing_cycle === 'one_time' ? b.transaction_date : b.start_date
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return db.localeCompare(da)
  })

  const paged = paginate(sorted, page, PER_PAGE)

  const Th = ({ children, right }: { children: ReactNode; right?: boolean }) => (
    <th className={cn(
      'px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide',
      right ? 'text-right' : 'text-left',
    )}>{children}</th>
  )

  return (
    <div className="max-w-3xl space-y-6">
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

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Total invested</p>
              <p className="text-xl font-bold font-mono mt-1">
                {formatAmount(summary.total_invested, property.currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">purchase + one-time expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Income received</p>
              <p className="text-xl font-bold font-mono mt-1 text-income">
                +{formatAmount(incomeTotal, property.currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">all income transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                {property.status === 'sold' ? 'Profit' : 'Status'}
              </p>
              {property.status === 'sold' && summary.profit !== null ? (
                <p className={cn(
                  'text-xl font-bold font-mono mt-1',
                  parseFloat(summary.profit) >= 0 ? 'text-income' : 'text-expense',
                )}>
                  {parseFloat(summary.profit) >= 0 ? '+' : ''}{formatAmount(summary.profit, property.currency)}
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
      )}

      {/* Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Transactions
              {transactions.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">({transactions.length})</span>
              )}
            </CardTitle>
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
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && !editingTx && (
            <TransactionForm
              propCurrency={property.currency}
              onSave={saveTx}
              onCancel={() => setShowAddForm(false)}
              saving={txSaving}
            />
          )}

          {editingTx && (
            <TransactionForm
              propCurrency={property.currency}
              initial={editingTx}
              onSave={saveTx}
              onCancel={() => setEditingTx(null)}
              saving={txSaving}
            />
          )}

          {loadingTx ? (
            <p className="text-sm text-muted-foreground animate-pulse py-4 text-center">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No transactions yet.{' '}
              <button className="text-primary hover:underline" onClick={() => setShowAddForm(true)}>
                Add the first one
              </button>
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm min-w-max">
                <thead className="border-y bg-muted/30">
                  <tr>
                    <Th> </Th>
                    <Th>Category</Th>
                    <Th>Title</Th>
                    <Th right>Amount</Th>
                    <Th>Cycle</Th>
                    <Th>Date</Th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map(tx => (
                    <TxRow
                      key={tx.id}
                      tx={tx}
                      onEdit={t => { setEditingTx(t); setShowAddForm(false) }}
                      onDelete={deleteTx}
                    />
                  ))}
                </tbody>
              </table>
              <div className="px-6">
                <Pagination total={sorted.length} page={page} perPage={PER_PAGE} onChange={setPage} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
