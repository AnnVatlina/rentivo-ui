import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, Plus, Pencil, TrendingUp, TrendingDown, X } from 'lucide-react'
import { propertiesApi } from '@/api/properties'
import type {
  PropertyUpdate,
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
import { CURRENCIES } from '@/lib/constants'
import { formatAmount, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

// ── Property edit form ────────────────────────────────────────────────────────

const propSchema = z.object({
  name:           z.string().min(1, 'Required'),
  address:        z.string().optional(),
  purchase_date:  z.string().min(1, 'Required'),
  purchase_price: z.string().min(1, 'Required'),
  currency:       z.string().min(1),
  status:         z.enum(['active', 'sold']),
  sale_date:      z.string().optional(),
  sale_price:     z.string().optional(),
  sale_notes:     z.string().optional(),
})
type PropForm = z.infer<typeof propSchema>

const SEL = 'h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const FIELD = 'flex flex-col gap-1.5'
const ERR = 'text-xs text-destructive'

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

const CYCLE_LABELS: Record<string, string> = {
  one_time: 'One-time', monthly: 'Monthly', weekly: 'Weekly',
  quarterly: 'Quarterly', yearly: 'Yearly',
}

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
      type: 'income',
      currency: propCurrency,
      billing_cycle: 'monthly',
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
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div className={FIELD}>
          <Label>Category *</Label>
          <Input placeholder="Rent, renovation…" {...register('category')} />
          {errors.category && <p className={ERR}>{errors.category.message}</p>}
        </div>
      </div>

      <div className={FIELD}>
        <Label>Title *</Label>
        <Input placeholder="Monthly rent" {...register('title')} />
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
      <td className="px-4 py-3 text-muted-foreground text-xs">{tx.category}</td>
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

  // Property + summary
  const { data: property, isLoading: loadingProp } = useQuery({
    queryKey: ['property', id],
    queryFn: () => propertiesApi.get(id!),
    enabled: !!id,
  })

  // Transactions
  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ['property', id, 'transactions'],
    queryFn: () => propertiesApi.listTransactions(id!),
    enabled: !!id,
  })

  // Property edit form
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<PropForm>({
    resolver: zodResolver(propSchema),
  })
  const status = useWatch({ control, name: 'status' })

  useEffect(() => {
    if (property) {
      reset({
        name:           property.name,
        address:        property.address ?? '',
        purchase_date:  property.purchase_date,
        purchase_price: property.purchase_price,
        currency:       property.currency,
        status:         property.status,
        sale_date:      property.sale_date ?? '',
        sale_price:     property.sale_price ?? '',
        sale_notes:     property.sale_notes ?? '',
      })
    }
  }, [property, reset])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['property', id] })
    queryClient.invalidateQueries({ queryKey: ['property', id, 'transactions'] })
    queryClient.invalidateQueries({ queryKey: ['properties'] })
  }

  // Update property
  const updateMutation = useMutation({
    mutationFn: (data: PropForm) => {
      const payload: PropertyUpdate = {
        name:           data.name,
        address:        data.address || undefined,
        purchase_date:  data.purchase_date,
        purchase_price: data.purchase_price,
        currency:       data.currency,
        status:         data.status,
        sale_date:      data.status === 'sold' ? data.sale_date || undefined : undefined,
        sale_price:     data.status === 'sold' ? data.sale_price || undefined : undefined,
        sale_notes:     data.status === 'sold' ? data.sale_notes || undefined : undefined,
      }
      return propertiesApi.update(id!, payload)
    },
    onSuccess: () => { invalidate(); toast.success('Property updated') },
    onError: () => toast.error('Failed to update property'),
  })

  // Delete property
  const deletePropMutation = useMutation({
    mutationFn: () => propertiesApi.remove(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.success('Property deleted')
      navigate('/properties')
    },
    onError: () => toast.error('Failed to delete property'),
  })

  // Add/Update transaction
  const [txSaving, setTxSaving] = useState(false)
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

  const Th = ({ children, right }: { children: ReactNode; right?: boolean }) => (
    <th className={cn(
      'px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide',
      right ? 'text-right' : 'text-left',
    )}>{children}</th>
  )

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
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

      {/* Edit property */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Property details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className={`${FIELD} col-span-2`}>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className={ERR}>{errors.name.message}</p>}
              </div>
              <div className={`${FIELD} col-span-2`}>
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className={`${FIELD} col-span-2`}>
                <Label htmlFor="purchase_price">Purchase price *</Label>
                <Input id="purchase_price" type="number" step="0.01" {...register('purchase_price')} />
              </div>
              <div className={FIELD}>
                <Label htmlFor="currency">Currency</Label>
                <select id="currency" className={SEL} {...register('currency')}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={FIELD}>
                <Label htmlFor="purchase_date">Purchase date *</Label>
                <Input id="purchase_date" type="date" {...register('purchase_date')} />
              </div>
              <div className={FIELD}>
                <Label htmlFor="status">Status</Label>
                <select id="status" className={SEL} {...register('status')}>
                  <option value="active">Active</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
            </div>

            {status === 'sold' && (
              <div className="space-y-4 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sale details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className={FIELD}>
                    <Label htmlFor="sale_date">Sale date</Label>
                    <Input id="sale_date" type="date" {...register('sale_date')} />
                  </div>
                  <div className={FIELD}>
                    <Label htmlFor="sale_price">Sale price</Label>
                    <Input id="sale_price" type="number" step="0.01" {...register('sale_price')} />
                  </div>
                </div>
                <div className={FIELD}>
                  <Label htmlFor="sale_notes">Notes</Label>
                  <Input id="sale_notes" {...register('sale_notes')} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deletePropMutation.isPending}
                onClick={() => {
                  if (confirm(`Delete "${property.name}"? This will also delete all transactions.`))
                    deletePropMutation.mutate()
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete property
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Transactions</CardTitle>
            {!showAddForm && !editingTx && (
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
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
          {/* Add form */}
          {showAddForm && !editingTx && (
            <TransactionForm
              propCurrency={property.currency}
              onSave={saveTx}
              onCancel={() => setShowAddForm(false)}
              saving={txSaving}
            />
          )}

          {/* Edit form */}
          {editingTx && (
            <TransactionForm
              propCurrency={property.currency}
              initial={editingTx}
              onSave={saveTx}
              onCancel={() => setEditingTx(null)}
              saving={txSaving}
            />
          )}

          {/* Table */}
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
                  {transactions.map(tx => (
                    <TxRow
                      key={tx.id}
                      tx={tx}
                      onEdit={t => { setEditingTx(t); setShowAddForm(false) }}
                      onDelete={deleteTx}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
