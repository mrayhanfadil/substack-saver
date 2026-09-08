import { ArrowDownToLine, Github } from 'lucide-react'

const GITHUB_URL = 'https://github.com/mrayhanfadil/substack-saver'

interface HeaderProps {
  online: boolean | null
}

export default function Header({ online }: HeaderProps) {
  const dot =
    online === null ? 'bg-slate-600' : online ? 'bg-emerald-400' : 'bg-red-400'
  const label =
    online === null ? 'checking backend…' : online ? 'backend online' : 'backend offline'

  return (
    <header className="mb-8 text-center sm:mb-10">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500">
        <ArrowDownToLine className="h-6 w-6 text-slate-950" strokeWidth={2.5} />
      </div>
      <h1 className="font-terminal text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
        SUBSTACK<span className="text-amber-400">_</span>SAVER
      </h1>
      <p className="mt-2 text-sm text-slate-400 sm:text-base">
        Save Substack posts as PDF, EPUB, or Markdown
      </p>
      <div className="mt-3 inline-flex items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          <span className="font-terminal text-[11px] uppercase tracking-wider text-slate-400">
            {label}
          </span>
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
          title="View on GitHub"
        >
          <Github className="h-3 w-3" />
          <span className="font-terminal text-[11px] uppercase tracking-wider">Source</span>
        </a>
      </div>
    </header>
  )
}
