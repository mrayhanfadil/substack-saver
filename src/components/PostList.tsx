import { Download, ExternalLink, Loader2 } from 'lucide-react'
import type { ConvertFormat, PostItem } from '../lib/api'

interface PostListProps {
  posts: PostItem[]
  pubName: string
  format: ConvertFormat
  downloadingUrl: string | null
  onDownload: (url: string) => void
}

export default function PostList({ posts, pubName, format, downloadingUrl, onDownload }: PostListProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="truncate font-terminal text-xs font-bold uppercase tracking-wider text-slate-300">
          {pubName}
        </h2>
        <span className="shrink-0 text-xs text-slate-500">{posts.length} posts</span>
      </div>
      {/* phones: let the list flow with the page — a nested scroll box slices the
          last row and fights the page scroll. Cap it only from sm up. */}
      <div className="scroll-thin space-y-1 sm:max-h-80 sm:overflow-y-auto sm:pr-1">
        {posts.map((post, i) => {
          const isLoading = downloadingUrl === post.url
          const dateStr = post.date
            ? new Date(post.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : ''
          return (
            <div
              key={`${post.url}-${i}`}
              className="group flex items-start gap-2 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-slate-800 hover:bg-slate-800/50 sm:gap-3 sm:px-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 min-w-0 flex-1 text-sm font-medium text-slate-200 hover:text-amber-400"
                  >
                    {post.title}
                  </a>
                  {/* touch devices have no hover — always show the hint there */}
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-slate-600 opacity-60 transition-opacity group-hover:opacity-100 sm:opacity-0" />
                </div>
                <div className="mt-0.5 flex items-center gap-2 overflow-hidden text-xs text-slate-500">
                  {dateStr && <span className="shrink-0">{dateStr}</span>}
                  {post.author && (
                    <>
                      <span className="shrink-0 text-slate-700">·</span>
                      <span className="truncate">{post.author}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDownload(post.url)}
                disabled={isLoading}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 font-terminal text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-amber-500 hover:text-amber-400 active:border-amber-500 active:text-amber-400 disabled:opacity-50 sm:min-h-0 sm:px-2.5 sm:py-1.5"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
                {format.toUpperCase()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
