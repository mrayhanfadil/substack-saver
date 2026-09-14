import { useEffect, useState } from 'react'
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
        setPubName(((res as unknown as Record<string, unknown>).name as string) || sub)
        setLoadingPub(false)
      })
      .catch((err) => {
        if (cancelled) return
        setPubError(err?.response?.data?.detail || 'Could not load publication posts')
        setLoadingPub(false)
      })

    return () => { cancelled = true }
  }, [url])

  return (
    <div className="pb-safe min-h-screen bg-slate-950 px-3 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <Header online={online} />

        {/* Main card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <UrlInput value={url} onChange={setUrl} onSubmit={convertCurrent} disabled={converting} />

          <div className="mt-4">
            <FormatSelector value={format} onChange={setFormat} disabled={converting} />
          </div>

          <div className="mt-4">
            <ConvertButton onClick={convertCurrent} loading={converting} />
          </div>

          {/* Messages */}
          {(error || notice) && (
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-sm break-words ${
                error
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {error || notice}
              <button
                onClick={dismissMessages}
                className="ml-2 underline opacity-60 hover:opacity-100"
              >
                dismiss
              </button>
            </div>
          )}

          {/* Publication post list */}
          {posts.length > 0 && (
            <div className="mt-6 border-t border-slate-800 pt-5">
              <PostList
                posts={posts}
                pubName={pubName}
                format={format}
                downloadingUrl={downloadingUrl}
                onDownload={downloadPost}
              />
            </div>
          )}

          {loadingPub && (
            <div className="mt-6 border-t border-slate-800 pt-5 text-center text-sm text-slate-500">
              Loading publication posts…
            </div>
          )}

          {pubError && (
            <div className="mt-6 border-t border-slate-800 pt-5 text-center text-sm text-slate-500">
              {pubError}
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-6">
            <DownloadHistory
              entries={history}
              onRevisit={(entry) => {
                setUrl(entry.url)
                setFormat(entry.format)
              }}
              onClear={clearHistory}
            />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-slate-600">
          Free &amp; Open Source —{' '}
          <a
            href="https://github.com/mrayhanfadil/substack-saver"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-400"
          >
            GitHub
          </a>{' '}
          — created by <a href="https://github.com/mrayhanfadil" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-400">@mrayhanfadil</a>
        </footer>
      </div>
    </div>
  )
}
