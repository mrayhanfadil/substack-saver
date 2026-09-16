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
      <Link2
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-pencil-soft)]"
        strokeWidth={1.5}
      />
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
        placeholder="https://example.substack.com/p/post-slug"
        spellCheck={false}
        autoComplete="off"
        /* monospace earns its keep on a URL — alignment helps the user verify
           what they pasted. 16px on phones prevents iOS Safari zoom on focus. */
        className="w-full rounded-md border border-[color:var(--color-rule)] bg-[color:var(--color-paper)] py-3.5 pl-11 pr-12 font-mono text-base text-[color:var(--color-ink)] placeholder:font-sans placeholder:text-[color:var(--color-pencil-soft)] focus:border-[color:var(--color-ink)] focus:outline-none disabled:opacity-60 sm:text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear URL"
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-[color:var(--color-pencil-soft)] transition-colors hover:bg-[color:var(--color-paper-soft)] hover:text-[color:var(--color-ink)] sm:right-2 sm:h-8 sm:w-8"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}
    </div>
  )
}
