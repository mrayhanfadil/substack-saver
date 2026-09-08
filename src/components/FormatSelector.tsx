import { BookOpen, FileCode2, FileText } from 'lucide-react'
import type { ConvertFormat } from '../lib/api'

interface FormatSelectorProps {
  value: ConvertFormat
  onChange: (f: ConvertFormat) => void
  disabled?: boolean
}

const OPTIONS: { id: ConvertFormat; label: string; icon: typeof FileText }[] = [
  { id: 'pdf', label: 'PDF', icon: FileText },
  { id: 'epub', label: 'EPUB', icon: BookOpen },
  { id: 'markdown', label: 'Markdown', icon: FileCode2 },
]

export default function FormatSelector({ value, onChange, disabled }: FormatSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Output format">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 font-terminal text-xs font-bold tracking-wider transition-colors disabled:opacity-60 ${
              active
                ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                : 'border-slate-800 bg-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
