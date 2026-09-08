import { Link2, X } from 'lucide-react'

interface UrlInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export default function UrlInput({ value, onChange, onSubmit, disabled }: UrlInputProps) {
  return (
    <div className="relative">
      <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="url"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit()
        }}
        placeholder="Paste a Substack post or publication URL…"
        spellCheck={false}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-800 bg-slate-900 py-3.5 pl-11 pr-11 font-terminal text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear URL"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
