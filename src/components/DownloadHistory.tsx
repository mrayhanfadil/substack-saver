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
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DownloadHistory({ entries, onRevisit, onClear }: DownloadHistoryProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-terminal text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-400"
        >
          <Trash2 className="h-3 w-3" />
          clear
        </button>
      </div>
      <div className="space-y-1">
        {entries.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onRevisit(e)}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-800"
          >
            <span className="truncate text-xs text-slate-300">{e.filename}</span>
            <span className="ml-2 shrink-0 text-[10px] text-slate-600">{timeAgo(e.timestamp)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
