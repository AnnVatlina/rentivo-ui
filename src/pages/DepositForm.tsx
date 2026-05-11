import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { depositsApi } from '@/api/deposits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CURRENCIES, COMPOUND_FREQUENCY_LABELS } from '@/lib/constants'
import { useSettings } from '@/contexts/SettingsContext'

const schema = z
  .object({
    title: z.string().min(1, 'Required'),
    bank_name: z.string().optional(),
    amount: z
      .string()
      .min(1, 'Required')
      .refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
    currency: z.string().min(1),
    open_date: z.string().min(1, 'Required'),
    close_date: z.string().optional(),
    annual_rate: z
      .string()
      .min(1, 'Required')
      .refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
    interest_type: z.enum(['simple', 'compound']),
    compound_frequency: z.string().optional(),
  })
  .refine(
    d => d.interest_type === 'simple' || !!d.compound_frequency,
    { message: 'Required for compound interest', path: ['compound_frequency'] },
  )

type FormData = z.infer<typeof schema>

const FIELD = 'flex flex-col gap-1.5'
const ERR = 'text-xs text-destructive'

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className={ERR}>{msg}</p> : null
}

export function DepositForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { settings } = useSettings()

  // Fetch existing deposit when editing
  const { data: existing, isLoading: loadingDeposit } = useQuery({
    queryKey: ['deposits', id],
    queryFn: () => depositsApi.get(id!),
    enabled: isEdit,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: settings?.default_currency ?? 'USD',
      interest_type: 'simple',
    },
  })

  const interestType = useWatch({ control, name: 'interest_type' })

  // Pre-fill form when existing deposit is loaded
  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        bank_name: existing.bank_name ?? '',
        amount: existing.amount,
        currency: existing.currency,
        open_date: existing.open_date,
        close_date: existing.close_date ?? '',
        annual_rate: existing.annual_rate,
        interest_type: existing.interest_type,
        compound_frequency: existing.compound_frequency ?? '',
      })
    }
  }, [existing, reset])

  const createMutation = useMutation({
    mutationFn: depositsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      toast.success('Deposit created')
      navigate('/deposits')
    },
    onError: () => toast.error('Failed to create deposit'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => depositsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      toast.success('Deposit updated')
      navigate('/deposits')
    },
    onError: () => toast.error('Failed to update deposit'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => depositsApi.remove(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      toast.success('Deposit deleted')
      navigate('/deposits')
    },
    onError: () => toast.error('Failed to delete deposit'),
  })

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      bank_name: data.bank_name || null,
      close_date: data.close_date || null,
      compound_frequency:
        data.interest_type === 'compound' ? (data.compound_frequency as 'daily' | 'monthly' | 'quarterly' | 'annually') || null : null,
    }
    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = () => {
    if (confirm(`Delete "${existing?.title}"? This cannot be undone.`)) {
      deleteMutation.mutate()
    }
  }

  if (isEdit && loadingDeposit) {
    return <p className="text-sm text-muted-foreground animate-pulse py-8">Loading…</p>
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/deposits')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">{isEdit ? 'Edit deposit' : 'New deposit'}</h2>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Deposit details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Title + Bank */}
            <div className="grid grid-cols-2 gap-4">
              <div className={FIELD}>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" placeholder="Sberbank 2026" {...register('title')} />
                <FieldError msg={errors.title?.message} />
              </div>
              <div className={FIELD}>
                <Label htmlFor="bank_name">Bank</Label>
                <Input id="bank_name" placeholder="Sberbank" {...register('bank_name')} />
              </div>
            </div>

            {/* Amount + Currency */}
            <div className="grid grid-cols-3 gap-4">
              <div className={`${FIELD} col-span-2`}>
                <Label htmlFor="amount">Amount *</Label>
                <Input id="amount" type="number" step="0.01" min="0" placeholder="100000.00" {...register('amount')} />
                <FieldError msg={errors.amount?.message} />
              </div>
              <div className={FIELD}>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('currency')}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Open + Close date */}
            <div className="grid grid-cols-2 gap-4">
              <div className={FIELD}>
                <Label htmlFor="open_date">Open date *</Label>
                <Input id="open_date" type="date" {...register('open_date')} />
                <FieldError msg={errors.open_date?.message} />
              </div>
              <div className={FIELD}>
                <Label htmlFor="close_date">Close date</Label>
                <Input id="close_date" type="date" {...register('close_date')} />
                <p className="text-xs text-muted-foreground">Leave empty for open-ended</p>
              </div>
            </div>

            {/* Rate + Interest type */}
            <div className="grid grid-cols-2 gap-4">
              <div className={FIELD}>
                <Label htmlFor="annual_rate">Annual rate (%) *</Label>
                <Input id="annual_rate" type="number" step="0.01" min="0" placeholder="17.0" {...register('annual_rate')} />
                <FieldError msg={errors.annual_rate?.message} />
              </div>
              <div className={FIELD}>
                <Label htmlFor="interest_type">Interest type</Label>
                <select
                  id="interest_type"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('interest_type')}
                >
                  <option value="simple">Simple</option>
                  <option value="compound">Compound</option>
                </select>
              </div>
            </div>

            {/* Compound frequency — only shown for compound */}
            {interestType === 'compound' && (
              <div className={FIELD}>
                <Label htmlFor="compound_frequency">Compound frequency *</Label>
                <select
                  id="compound_frequency"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('compound_frequency')}
                >
                  <option value="">Select frequency…</option>
                  {Object.entries(COMPOUND_FREQUENCY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <FieldError msg={errors.compound_frequency?.message} />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create deposit'}
              </Button>

              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
