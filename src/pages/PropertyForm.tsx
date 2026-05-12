import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { propertiesApi } from '@/api/properties'
import type { PropertyCreate } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CURRENCIES } from '@/lib/constants'
import { useSettings } from '@/contexts/SettingsContext'

const schema = z.object({
  name:           z.string().min(1, 'Required'),
  address:        z.string().optional(),
  purchase_date:  z.string().min(1, 'Required'),
  purchase_price: z.string().min(1, 'Required').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Must be positive'),
  currency:       z.string().min(1),
  status:         z.enum(['active', 'sold']),
  sale_date:      z.string().optional(),
  sale_price:     z.string().optional(),
  sale_notes:     z.string().optional(),
})

type FormData = z.infer<typeof schema>

const FIELD = 'flex flex-col gap-1.5'
const ERR = 'text-xs text-destructive'

export function PropertyForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { settings } = useSettings()

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: settings?.default_currency ?? 'USD',
      status: 'active',
    },
  })

  const status = useWatch({ control, name: 'status' })

  const createMutation = useMutation({
    mutationFn: (p: PropertyCreate) => propertiesApi.create(p),
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.success('Property created')
      navigate(`/properties/${property.id}`)
    },
    onError: () => toast.error('Failed to create property'),
  })

  const onSubmit = (data: FormData) => {
    const payload: PropertyCreate = {
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
    createMutation.mutate(payload)
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/properties')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">New property</h2>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Property details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

            <div className="grid grid-cols-2 gap-4">
              <div className={`${FIELD} col-span-2`}>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" placeholder="Apartment, Moscow" {...register('name')} />
                {errors.name && <p className={ERR}>{errors.name.message}</p>}
              </div>
              <div className={`${FIELD} col-span-2`}>
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Pushkin St, 10, apt. 8" {...register('address')} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className={`${FIELD} col-span-2`}>
                <Label htmlFor="purchase_price">Purchase price *</Label>
                <Input id="purchase_price" type="number" step="0.01" min="0" {...register('purchase_price')} />
                {errors.purchase_price && <p className={ERR}>{errors.purchase_price.message}</p>}
              </div>
              <div className={FIELD}>
                <Label htmlFor="currency">Currency</Label>
                <select id="currency" className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" {...register('currency')}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={FIELD}>
                <Label htmlFor="purchase_date">Purchase date *</Label>
                <Input id="purchase_date" type="date" {...register('purchase_date')} />
                {errors.purchase_date && <p className={ERR}>{errors.purchase_date.message}</p>}
              </div>
              <div className={FIELD}>
                <Label htmlFor="status">Status</Label>
                <select id="status" className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" {...register('status')}>
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
                    <Input id="sale_price" type="number" step="0.01" min="0" {...register('sale_price')} />
                  </div>
                </div>
                <div className={FIELD}>
                  <Label htmlFor="sale_notes">Notes</Label>
                  <Input id="sale_notes" placeholder="Notes about the sale…" {...register('sale_notes')} />
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create property'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
