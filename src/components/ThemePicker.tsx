import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

const THEMES: {
  id: Theme
  label: string
  sidebar: string
  bg: string
  accent: string
  dot: string
}[] = [
  {
    id: 'indigo',
    label: 'Indigo',
    sidebar: 'bg-indigo-700',
    bg: 'bg-gray-50',
    accent: 'bg-indigo-500',
    dot: 'bg-indigo-500',
  },
  {
    id: 'neutral',
    label: 'Neutral',
    sidebar: 'bg-slate-700',
    bg: 'bg-slate-50',
    accent: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  {
    id: 'dark',
    label: 'Dark',
    sidebar: 'bg-gray-900',
    bg: 'bg-gray-950',
    accent: 'bg-emerald-400',
    dot: 'bg-emerald-400',
  },
]

export function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-4 flex-wrap">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={cn(
            'group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all',
            theme === t.id
              ? 'border-primary ring-2 ring-primary/30 scale-105'
              : 'border-border hover:border-primary/50',
          )}
          style={{ width: 120, height: 90 }}
          title={t.label}
        >
          {/* Mini sidebar */}
          <div className={cn('absolute inset-y-0 left-0 w-8', t.sidebar)}>
            <div className="mt-3 mx-1 space-y-1">
              {[40, 32, 36].map((w, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full bg-white/40"
                  style={{ width: w }}
                />
              ))}
            </div>
          </div>
          {/* Content area */}
          <div className={cn('absolute inset-y-0 left-8 right-0', t.bg)}>
            <div className="p-2 space-y-1.5">
              <div className="flex gap-1">
                <div className={cn('h-5 rounded flex-1', t.accent, 'opacity-80')} />
                <div className={cn('h-5 rounded flex-1 bg-gray-300/50')} />
              </div>
              <div className="h-1.5 rounded-full bg-gray-300/60 w-full" />
              <div className="h-1.5 rounded-full bg-gray-300/40 w-3/4" />
              <div className="h-1.5 rounded-full bg-gray-300/30 w-5/6" />
            </div>
          </div>
          {/* Label */}
          <div className="absolute bottom-1 inset-x-0 text-center">
            <span className="text-[10px] font-semibold text-gray-500 bg-white/80 px-1.5 rounded">
              {t.label}
            </span>
          </div>
          {/* Selected check */}
          {theme === t.id && (
            <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
              <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
