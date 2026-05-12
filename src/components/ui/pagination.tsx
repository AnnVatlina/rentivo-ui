import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  total: number
  page: number
  perPage: number
  onChange: (page: number) => void
}

export function Pagination({ total, page, perPage, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  // Build page number list: always show first, last, current ± 1, and ellipsis
  const pages: (number | '…')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  const btn = (label: React.ReactNode, target: number, disabled: boolean, active = false) => (
    <button
      key={String(label)}
      onClick={() => !disabled && onChange(target)}
      disabled={disabled}
      className={cn(
        'h-8 min-w-8 px-2 rounded-md text-sm flex items-center justify-center transition-colors select-none',
        active
          ? 'bg-primary text-primary-foreground font-semibold'
          : disabled
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-xs text-muted-foreground">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-0.5">
        {btn(<ChevronLeft className="h-4 w-4" />, page - 1, page === 1)}
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`ell-${i}`} className="h-8 w-6 flex items-center justify-center text-muted-foreground text-sm">…</span>
            : btn(p, p, false, p === page),
        )}
        {btn(<ChevronRight className="h-4 w-4" />, page + 1, page === totalPages)}
      </div>
    </div>
  )
}

/** Returns the slice of data for the current page */
export function paginate<T>(data: T[], page: number, perPage: number): T[] {
  return data.slice((page - 1) * perPage, page * perPage)
}
