import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Landmark, CreditCard, Building2, Trash2, Sparkles } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { settingsApi } from '@/api/settings'
import { ThemePicker } from '@/components/ThemePicker'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { CURRENCIES } from '@/lib/constants'

// ── Module row ────────────────────────────────────────────────────────────────

interface ModuleRowProps {
  id: string
  icon: ReactNode
  label: string
  description: string
  checked: boolean
  onToggle: () => Promise<void>
}

function ModuleRow({ id, icon, label, description, checked, onToggle }: ModuleRowProps) {
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    setSaving(true)
    try {
      await onToggle()
    } catch {
      toast.error(`Failed to update ${label} module`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={handle}
        disabled={saving}
      />
    </div>
  )
}

// ── Settings page ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { settings, update, refresh } = useSettings()

  // Currency form
  const [currency, setCurrency] = useState(settings?.default_currency ?? 'USD')
  const [currencyDirty, setCurrencyDirty] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)

  const saveCurrency = async () => {
    setSavingCurrency(true)
    try {
      await update({ default_currency: currency })
      setCurrencyDirty(false)
      toast.success('Currency saved')
    } catch {
      toast.error('Failed to save currency')
    } finally {
      setSavingCurrency(false)
    }
  }

  // Demo data
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [deletingData, setDeletingData] = useState(false)

  const loadDemo = async () => {
    if (!confirm('Load sample data? Existing records will not be deleted.')) return
    setLoadingDemo(true)
    try {
      const r = await settingsApi.loadDemoData()
      await refresh()
      toast.success(
        `Loaded: ${r.deposits} deposits · ${r.subscriptions} subscriptions · ${r.properties} properties`,
      )
    } catch {
      toast.error('Failed to load demo data')
    } finally {
      setLoadingDemo(false)
    }
  }

  const deleteData = async () => {
    if (!confirm('Delete ALL your data? This cannot be undone.')) return
    setDeletingData(true)
    try {
      const r = await settingsApi.deleteAllData()
      await refresh()
      toast.success(
        `Deleted: ${r.deposits} deposits · ${r.subscriptions} subscriptions · ${r.properties} properties`,
      )
    } catch {
      toast.error('Failed to delete data')
    } finally {
      setDeletingData(false)
    }
  }

  if (!settings) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your preferences and account data.</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose a colour theme for the interface.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePicker />
        </CardContent>
      </Card>

      {/* Default Currency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Default Currency</CardTitle>
          <CardDescription>
            Pre-selected in all forms and the analytics page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value)
                setCurrencyDirty(e.target.value !== settings.default_currency)
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={saveCurrency}
              disabled={!currencyDirty || savingCurrency}
            >
              {savingCurrency ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Modules</CardTitle>
          <CardDescription>
            Disabled modules are hidden from navigation and return null in analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <ModuleRow
            id="mod-deposits"
            icon={<Landmark className="h-4 w-4" />}
            label="Deposits"
            description="Track bank deposits and accrued interest"
            checked={settings.module_deposits}
            onToggle={() => update({ module_deposits: !settings.module_deposits })}
          />
          <ModuleRow
            id="mod-subscriptions"
            icon={<CreditCard className="h-4 w-4" />}
            label="Subscriptions"
            description="Track recurring payments and monthly cost"
            checked={settings.module_subscriptions}
            onToggle={() => update({ module_subscriptions: !settings.module_subscriptions })}
          />
          <ModuleRow
            id="mod-property"
            icon={<Building2 className="h-4 w-4" />}
            label="Property"
            description="Track real estate investments and cashflow"
            checked={settings.module_property}
            onToggle={() => update({ module_property: !settings.module_property })}
          />
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data</CardTitle>
          <CardDescription>
            Load sample records to explore the app, or wipe everything to start fresh.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadDemo} disabled={loadingDemo}>
            <Sparkles className="h-4 w-4 mr-2" />
            {loadingDemo ? 'Loading…' : 'Load demo data'}
          </Button>
          <Button variant="destructive" onClick={deleteData} disabled={deletingData}>
            <Trash2 className="h-4 w-4 mr-2" />
            {deletingData ? 'Deleting…' : 'Delete all data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
