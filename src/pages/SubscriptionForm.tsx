import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, Ban } from 'lucide-react'
import { subscriptionsApi } from '@/api/subscriptions'
import type { SubscriptionCreate } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CURRENCIES } from '@/lib/constants'
import { formatAmount } from '@/lib/format'
import { useSettings } from '@/contexts/SettingsContext'

const schema = z.object({
  title:         z.string().min(1, 'Required'),
  category:      z.string().optional(),
  amount:        z.string().min(1, 'Required').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Must be positive'),
  currency:      z.string().min(1),
  billing_cycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'biennial', 'one_time']),
  start_date:    z.string().min(1, 'Required'),
  end_date:      z.string().optional(),
  is_active:     z.boolean(),
})

type FormData = z.infer<typeof schema>

function monthlyCost(amount: string, cycle: string): number | null {
  const n = parseFloat(amount)
  if (isNaN(n) || n <= 0) return null
  switch (cycle) {
    case 'weekly':    return n * 52 / 12
    case 'monthly':   return n
    case 'quarterly': return n / 3
    case 'yearly':    return n / 12
    case 'biennial':  return n / 24
    case 'one_time':  return 0
    default:          return null
  }
}

const FIELD = 'flex flex-col gap-1.5'
const ERR   = 'text-xs text-destructive'

export function SubscriptionForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { settings } = useSettings()

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['subscriptions', id],
    queryFn: () => subscriptionsApi.get(id!),
    enabled: isEdit,
  })

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency:      settings?.default_currency ?? 'USD',
      billing_cycle: 'monthly',
      is_active:     true,
    },
  })

  const amount       = useWatch({ control, name: 'amount' })
  const billingCycle = useWatch({ control, name: 'billing_cycle' })
  const isActive     = useWatch({ control, name: 'is_active' })
  const currency     = useWatch({ control, name: 'currency' })

  const preview = useMemo(() => monthlyCost(amount, billingCycle), [amount, billingCycle])

  useEffect(() => {
    if (existing) {
      reset({
        title:         existing.title,
        category:      existing.category ?? '',
        amount:        existing.amount,
        currency:      existing.currency,
        billing_cycle: existing.billing_cycle,
        start_date:    existing.start_date,
        end_date:      existing.end_date ?? '',
        is_active:     existing.is_active,
      })
    }
  }, [existing, reset])

  const createMutation = useMutation({
    mutationFn: (p: SubscriptionCreate) => subscriptionsApi.create(p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Subscription created'); navigate('/subscriptions') },
    onError: () => toast.error('Failed to create subscription'),
  })

  const updateMutation = useMutation({
    mutationFn: (p: SubscriptionCreate) => subscriptionsApi.update(id!, p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Subscription updated'); navigate('/subscriptions') },
    onError: () => toast.error('Failed to update subscription'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionsApi.update(id!, { is_active: false }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Subscription cancelled'); navigate('/subscriptions') },
    onError: () => toast.error('Failed to cancel subscription'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => subscriptionsApi.remove(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Subscription deleted'); navigate('/subscriptions') },
    onError: () => toast.error('Failed to delete subscription'),
  })

  const onSubmit = (data: FormData) => {
    const payload: SubscriptionCreate = {
      title:         data.title,
      category:      data.category || undefined,
      amount:        data.amount,
      currency:      data.currency,
      billing_cycle: data.billing_cycle,
      start_date:    data.start_date,
      end_date:      data.end_date || undefined,
      is_active:     data.is_active,
    }
    isEdit ? updateMutation.mutate(payload) : createMutation.mutate(payload)
  }

  if (isEdit && loadingExisting) {
    return <p className="text-sm text-muted-foreground animate-pulse py-8">Loading…</p>
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/subscriptions')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">{isEdit ? 'Edit subscription' : 'New subscription'}</h2>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Subscription details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

            {/* Title + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className={FIELD}>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" placeholder="Netflix" {...register('title')} />
                {errors.title && <p className={ERR}>{errors.title.message}</p>}
              </div>
              <div className={FIELD}>
                <Label htmlFor="category">Category</Label>
                <Input id="category" placeholder="Streaming" {...register('category')} />
              </div>
            </div>

            {/* Amount + Currency */}
            <div className="grid grid-cols-3 gap-4">
              <div className={`${FIELD} col-span-2`}>
                <Label htmlFor="amount">Amount *</Label>
                <Input id="amount" type="number" step="0.01" min="0" placeholder="15.99" {...register('amount')} />
                {errors.amount && <p className={ERR}>{errors.amount.message}</p>}
              </div>
              <div className={FIELD}>
                <Label htmlFor="currency">Currency</Label>
                <select id="currency" className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" {...register('currency')}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Billing cycle */}
            <div className={FIELD}>
              <Label htmlFor="billing_cycle">Billing cycle</Label>
              <select id="billing_cycle" className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" {...register('billing_cycle')}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="biennial">2 years</option>
                <option value="one_time">One-time</option>
              </select>
            </div>

            {/* Monthly cost preview */}
            {preview !== null && billingCycle !== 'monthly' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                <span>Monthly equivalent:</span>
                <span className={`font-mono font-semibold ${preview > 0 ? 'text-expense' : 'text-foreground'}`}>
                  {preview > 0 ? formatAmount(preview, currency) : '—'}
                </span>
              </div>
            )}

            {/* Start + End date */}
            <div className="grid grid-cols-2 gap-4">
              <div className={FIELD}>
                <Label htmlFor="start_date">Start date *</Label>
                <Input id="start_date" type="date" {...register('start_date')} />
                {errors.start_date && <p className={ERR}>{errors.start_date.message}</p>}
              </div>
              <div className={FIELD}>
                <Label htmlFor="end_date">End date</Label>
                <Input id="end_date" type="date" {...register('end_date')} />
                <p className="text-xs text-muted-foreground">Leave empty if ongoing</p>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3 py-1">
              <input type="checkbox" id="is_active" className="h-4 w-4 accent-primary" {...register('is_active')} />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
                {!isActive && <span className="ml-2 text-xs text-muted-foreground">(will appear as cancelled)</span>}
              </Label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create subscription'}
              </Button>

              {isEdit && (
                <div className="flex gap-2">
                  {existing?.is_active && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { if (confirm('Cancel this subscription?')) cancelMutation.mutate() }}
                      disabled={cancelMutation.isPending}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => { if (confirm(`Delete "${existing?.title}"?`)) deleteMutation.mutate() }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
