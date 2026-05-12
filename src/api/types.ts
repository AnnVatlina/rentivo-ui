// ---- Auth ----

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

// ---- Settings ----

export interface UserSettings {
  id: string
  user_id: string
  module_deposits: boolean
  module_subscriptions: boolean
  module_property: boolean
  default_currency: string
  created_at: string
}

export interface UserSettingsUpdate {
  module_deposits?: boolean
  module_subscriptions?: boolean
  module_property?: boolean
  default_currency?: string
}

export interface DemoDataResult {
  deposits: number
  subscriptions: number
  properties: number
  property_transactions: number
}

export interface DeleteDataResult {
  deposits: number
  subscriptions: number
  properties: number
}

// ---- Deposits ----

export type InterestType = 'simple' | 'compound'
export type CompoundFrequency = 'daily' | 'monthly' | 'quarterly' | 'annually'

export interface DepositOut {
  id: string
  user_id: string
  title: string
  bank_name: string | null
  amount: string
  currency: string
  open_date: string
  close_date: string | null
  annual_rate: string
  interest_type: InterestType
  compound_frequency: CompoundFrequency | null
  income_to_date: string
  days_elapsed: number
  created_at: string
}

export interface DepositCreate {
  title: string
  bank_name?: string | null
  amount: string
  currency: string
  open_date: string
  close_date?: string | null
  annual_rate: string
  interest_type?: InterestType
  compound_frequency?: CompoundFrequency | null
}

export type DepositUpdate = Partial<DepositCreate>

// ---- Subscriptions ----

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'biennial' | 'one_time'

export interface SubscriptionOut {
  id: string
  user_id: string
  title: string
  category: string | null
  amount: string
  currency: string
  billing_cycle: BillingCycle
  start_date: string
  end_date: string | null
  is_active: boolean
  monthly_cost: string
  next_payment_date: string | null
  created_at: string
}

export interface SubscriptionCreate {
  title: string
  category?: string | null
  amount: string
  currency: string
  billing_cycle: BillingCycle
  start_date: string
  end_date?: string | null
  is_active?: boolean
}

export type SubscriptionUpdate = Partial<SubscriptionCreate>

// ---- Properties ----

export type PropertyStatus = 'active' | 'sold'

export interface PropertySummary {
  total_invested: string
  profit: string | null
}

export interface PropertyOut {
  id: string
  user_id: string
  name: string
  address: string | null
  purchase_date: string
  purchase_price: string
  currency: string
  status: PropertyStatus
  sale_date: string | null
  sale_price: string | null
  sale_notes: string | null
  created_at: string
}

export interface PropertyDetailOut extends PropertyOut {
  summary: PropertySummary
}

export interface PropertyCreate {
  name: string
  address?: string | null
  purchase_date: string
  purchase_price: string
  currency: string
  status: PropertyStatus
  sale_date?: string | null
  sale_price?: string | null
  sale_notes?: string | null
}

export type PropertyUpdate = Partial<PropertyCreate>

// ---- Property Transactions ----

export type TransactionType = 'income' | 'expense'
export type TransactionBillingCycle = 'one_time' | 'monthly' | 'weekly' | 'quarterly' | 'yearly'

export interface PropertyTransactionOut {
  id: string
  property_id: string
  type: TransactionType
  category: string
  title: string
  amount: string
  currency: string
  billing_cycle: TransactionBillingCycle
  transaction_date: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface PropertyTransactionCreate {
  type: TransactionType
  category: string
  title: string
  amount: string
  currency: string
  billing_cycle: TransactionBillingCycle
  transaction_date?: string | null
  start_date?: string | null
  end_date?: string | null
}

export type PropertyTransactionUpdate = Partial<PropertyTransactionCreate>

// ---- Property Analytics ----

export interface PropertyAnalyticsMonth {
  month: number
  income: string
  expenses: string
  net: string
  is_projected: boolean
}

export interface PropertyAnalytics {
  property_id: string
  year: number
  currency: string
  months: PropertyAnalyticsMonth[]
}

// ---- Global Analytics ----

export interface AnalyticsMonth {
  month: number
  year: number
  deposit_income: string | null
  subscription_expenses: string | null
  property_income: string | null
  property_expenses: string | null
  net: string
  is_projected: boolean
}

export interface Analytics {
  year: number
  currency: string
  months: AnalyticsMonth[]
}

// ---- Import ----

export interface ImportResult {
  deposits: number
  subscriptions: number
  properties: number
  property_transactions: number
  skipped: number
}
