import { Download, Loader2 } from 'lucide-react'

interface ConvertButtonProps {
  onClick: () => void
  loading: boolean
  disabled?: boolean
}

export default function ConvertButton({ onClick, loading, disabled }: ConvertButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[color:var(--color-ink)] py-3.5 text-sm font-semibold text-[color:var(--color-paper)] transition-colors hover:bg-[color:var(--color-ink-soft)] active:bg-[color:var(--color-ink-soft)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          <span>Converting…</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4" strokeWidth={1.75} />
          <span>Save post</span>
        </>
      )}
    </button>
  )
}
