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
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3.5 font-terminal text-sm font-bold tracking-wider text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          CONVERTING…
        </>
      ) : (
        <>
          <Download className="h-4 w-4" strokeWidth={2.5} />
          CONVERT
        </>
      )}
    </button>
  )
}
