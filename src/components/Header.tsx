import { ArrowDownToLine } from 'lucide-react'

const GITHUB_URL = 'https://github.com/mrayhanfadil/substack-saver'

interface HeaderProps {
  online: boolean | null
}

export default function Header({ online }: HeaderProps) {
  const dot =
    online === null
      ? 'bg-[color:var(--color-pencil-soft)]'
      : online
        ? 'bg-[color:var(--color-ink)]'
        : 'bg-red-400/70'
  const label =
    online === null
      ? 'checking'
      : online
        ? 'online'
        : 'offline'

  return (
    <header className="mb-10 flex items-start justify-between sm:mb-14">
      {/* Wordmark — Newsreader upright roman, no italics (refusing the AI rut) */}
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-baseline gap-2"
        title="View on GitHub"
      >
        <ArrowDownToLine
          className="h-4 w-4 -translate-y-0.5 text-[color:var(--color-ink)]"
          strokeWidth={1.75}
        />
        <span className="font-display text-[1.6rem] font-medium leading-none tracking-tight text-[color:var(--color-ink)] sm:text-[1.85rem]">
          Substack
        </span>
        <span className="font-display text-[1.6rem] font-medium leading-none tracking-tight text-[color:var(--color-pencil-soft)] sm:text-[1.85rem]">
          Saver
        </span>
      </a>

      {/* Right: status + GitHub icon link */}
      <nav className="flex items-center gap-3 pt-1">
        <div
          className="inline-flex items-center gap-1.5 text-xs text-[color:var(--color-pencil-soft)]"
          aria-live="polite"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          <span>{label}</span>
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[color:var(--color-pencil-soft)] underline decoration-[color:var(--color-rule)] underline-offset-4 transition-colors hover:text-[color:var(--color-ink)] hover:decoration-[color:var(--color-ink)]"
        >
          GitHub
        </a>
      </nav>
    </header>
  )
}
