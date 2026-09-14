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
      <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 sm:left-4" />
      <input
        type="url"
        inputMode="url"
        enterKeyHint="go"
        autoCapitalize="none"
        autoCorrect="off"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit()
        }}
        placeholder="Paste a Substack post or publication URL…"
        spellCheck={false}
        autoComplete="off"
        /* text-base on phones: anything under 16px makes iOS Safari zoom on focus */
        className="w-full rounded-lg border border-slate-800 bg-slate-900 py-3.5 pl-10 pr-14 font-terminal text-base text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60 sm:pl-11 sm:pr-12 sm:text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear URL"
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300 sm:right-2 sm:h-8 sm:w-8"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
