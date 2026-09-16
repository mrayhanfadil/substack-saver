import { Clock, Trash2 } from 'lucide-react'
import type { HistoryEntry } from '../hooks/useConverter'

interface DownloadHistoryProps {
  entries: HistoryEntry[]
  onRevisit: (entry: HistoryEntry) => void
  onClear: () => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function DownloadHistory({
  entries,
  onRevisit,
  onClear,
}: DownloadHistoryProps) {
  return (
    <section className="mt-10 border-t border-[color:var(--color-rule)] pt-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[color:var(--color-pencil-soft)]">
          <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Recently saved</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex min-h-11 items-center gap-1 rounded px-2 text-xs text-[color:var(--color-pencil-soft)] transition-colors hover:text-red-700 active:text-red-700 sm:min-h-8 sm:px-1"
        >
          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
          <span>Clear</span>
        </button>
      </div>
      <ul className="divide-y divide-[color:var(--color-rule-soft)]">
        {entries.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onRevisit(e)}
              className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left transition-colors hover:bg-[color:var(--color-paper-soft)] sm:py-2"
            >
              <span className="min-w-0 flex-1 truncate font-display text-sm text-[color:var(--color-ink)]">
                {e.filename}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-[color:var(--color-pencil-soft)]">
                {timeAgo(e.timestamp)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
