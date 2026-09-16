import { useEffect, useState } from 'react'
import { ArrowDownToLine, BookOpen, X } from 'lucide-react'
import Header from './components/Header'
import UrlInput from './components/UrlInput'
import FormatSelector from './components/FormatSelector'
import ConvertButton from './components/ConvertButton'
import PostList from './components/PostList'
import DownloadHistory from './components/DownloadHistory'
import { useConverter } from './hooks/useConverter'
import {
  extractSubdomain,
  fetchPublication,
  isPublicationUrl,
  type PostItem,
} from './lib/api'

export default function App() {
  const {
    url,
    setUrl,
    format,
    setFormat,
    converting,
    downloadingUrl,
    error,
    notice,
    history,
    convertCurrent,
    downloadPost,
    clearHistory,
    dismissMessages,
  } = useConverter()

  const [online, setOnline] = useState<boolean | null>(null)
  const [posts, setPosts] = useState<PostItem[]>([])
  const [pubName, setPubName] = useState<string>('')
  const [loadingPub, setLoadingPub] = useState(false)
  const [pubError, setPubError] = useState<string | null>(null)

  // Health check
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/health')
        setOnline(res.ok)
      } catch {
        setOnline(false)
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [])

  // Detect publication URLs and fetch post list
  useEffect(() => {
    const trimmed = url.trim()
    if (!trimmed || !isPublicationUrl(trimmed)) {
      setPosts([])
      setPubName('')
      setPubError(null)
      return
    }

    const sub = extractSubdomain(trimmed)
    if (!sub) return

    let cancelled = false
    setLoadingPub(true)
    setPubError(null)

    fetchPublication(sub)
      .then((res) => {
        if (cancelled) return
        setPosts(res.posts || [])
        setPubName(
          ((res as unknown as Record<string, unknown>).name as string) || sub
        )
        setLoadingPub(false)
      })
      .catch((err) => {
        if (cancelled) return
        setPubError(
          err?.response?.data?.detail || 'Could not load this publication.'
        )
        setLoadingPub(false)
      })

    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div className="pb-safe min-h-screen bg-[color:var(--color-paper)] px-5 pt-8 sm:px-8 sm:pt-12 lg:px-10">
      <div className="mx-auto w-full max-w-2xl">
        <Header online={online} />

        {/* Lead-in: one line of editorial copy, not a hero paragraph */}
        <p className="mb-8 font-display text-base leading-snug text-[color:var(--color-pencil)] sm:text-lg">
          Paste a Substack link. Choose a format. Save it for later.
        </p>

        {/* Compose card — the input IS the hero */}
        <section className="rounded-lg border border-[color:var(--color-rule)] bg-[color:var(--color-paper-soft)] p-4 sm:p-6">
          <UrlInput
            value={url}
            onChange={setUrl}
            onSubmit={convertCurrent}
            disabled={converting}
          />

          <div className="mt-5">
            <FormatSelector
              value={format}
              onChange={setFormat}
              disabled={converting}
            />
          </div>

          <div className="mt-5">
            <ConvertButton onClick={convertCurrent} loading={converting} />
          </div>

          {/* Messages — calmer editorial treatment, not terminal banners */}
          {(error || notice) && (
            <div
              role={error ? 'alert' : 'status'}
              className={`mt-5 flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
                error
                  ? 'border-red-300/60 bg-red-50/60 text-red-800'
                  : 'border-[color:var(--color-rule)] bg-[color:var(--color-paper)] text-[color:var(--color-ink)]'
              }`}
            >
              <div className="min-w-0 flex-1 break-words">{error || notice}</div>
              <button
                onClick={dismissMessages}
                aria-label="Dismiss message"
                className="-m-1 shrink-0 rounded p-1 text-current opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </section>

        {/* Publication browse — table-of-contents feel */}
        {(posts.length > 0 || loadingPub || pubError) && (
          <section className="mt-8">
            {posts.length > 0 && (
              <PostList
                posts={posts}
                pubName={pubName}
                format={format}
                downloadingUrl={downloadingUrl}
                onDownload={downloadPost}
              />
            )}

            {loadingPub && (
              <div className="flex items-center gap-3 border-t border-[color:var(--color-rule)] pt-6 text-sm text-[color:var(--color-pencil-soft)]">
                <BookOpen
                  className="h-4 w-4 animate-pulse"
                  strokeWidth={1.5}
                />
                <span className="font-display">
                  Loading posts from {pubName || 'this publication'}…
                </span>
              </div>
            )}

            {pubError && (
              <div className="border-t border-[color:var(--color-rule)] pt-6">
                <div className="font-display text-sm text-[color:var(--color-pencil)]">
                  {pubError}
                </div>
                <div className="mt-1 text-xs text-[color:var(--color-pencil-soft)]">
                  Try a publication URL like{' '}
                  <code className="font-mono text-[color:var(--color-ink)]">
                    https://newsletter.substack.com
                  </code>
                  .
                </div>
              </div>
            )}
          </section>
        )}

        {/* Recently saved — the only "history" the page earns */}
        {history.length > 0 && (
          <DownloadHistory
            entries={history}
            onRevisit={(entry) => {
              setUrl(entry.url)
              setFormat(entry.format)
            }}
            onClear={clearHistory}
          />
        )}

        {/* Footer */}
        <footer className="mt-16 flex flex-col gap-3 border-t border-[color:var(--color-rule)] pt-6 text-xs text-[color:var(--color-pencil-soft)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownToLine
              className="h-3.5 w-3.5"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span>
              Free & open source —{' '}
              <a
                href="https://github.com/mrayhanfadil/substack-saver"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-ink)] underline decoration-[color:var(--color-rule)] underline-offset-4 transition-colors hover:decoration-[color:var(--color-ink)]"
              >
                mrayhanfadil/substack-saver
              </a>
            </span>
          </div>
          <div className="text-[color:var(--color-pencil-soft)]">
            by{' '}
            <a
              href="https://github.com/mrayhanfadil"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--color-ink)] underline decoration-[color:var(--color-rule)] underline-offset-4 transition-colors hover:decoration-[color:var(--color-ink)]"
            >
              @mrayhanfadil
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}
