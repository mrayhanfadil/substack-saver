import { BookOpen, FileCode2, FileText } from 'lucide-react'
import type { ConvertFormat } from '../lib/api'

interface FormatSelectorProps {
  value: ConvertFormat
  onChange: (f: ConvertFormat) => void
  disabled?: boolean
}

const OPTIONS: {
  id: ConvertFormat
  label: string
  description: string
  icon: typeof FileText
}[] = [
  {
    id: 'pdf',
    label: 'PDF',
    description: 'print-ready, images embedded',
    icon: FileText,
  },
  {
    id: 'epub',
    label: 'EPUB',
    description: 'e-reader, reflowable',
    icon: BookOpen,
  },
  {
    id: 'markdown',
    label: 'Markdown',
    description: 'plain text + images folder',
    icon: FileCode2,
  },
]

export default function FormatSelector({
  value,
  onChange,
  disabled,
}: FormatSelectorProps) {
  return (
    <div
      className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2"
      role="radiogroup"
      aria-label="Output format"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            role="radio"
            aria-checked={active}
            className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
              active
                ? 'border-[color:var(--color-ink)] bg-[color:var(--color-paper-soft)] text-[color:var(--color-ink)]'
                : 'border-[color:var(--color-rule)] bg-transparent text-[color:var(--color-pencil)] hover:border-[color:var(--color-pencil-soft)] hover:bg-[color:var(--color-paper-soft)]'
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${active ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-pencil-soft)]'}`}
              strokeWidth={1.5}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium leading-tight">{opt.label}</div>
              <div className="truncate text-[11px] leading-tight text-[color:var(--color-pencil-soft)]">
                {opt.description}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
