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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-terminal text-xs font-bold uppercase tracking-wider text-slate-300">
          {pubName}
        </h2>
        <span className="text-xs text-slate-500">{posts.length} posts</span>
      </div>
      <div className="scroll-thin max-h-80 space-y-1 overflow-y-auto pr-1">
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
              className="group flex items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-slate-800 hover:bg-slate-800/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-slate-200 hover:text-amber-400"
                  >
                    {post.title}
                  </a>
                  <ExternalLink className="h-3 w-3 shrink-0 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  {dateStr && <span>{dateStr}</span>}
                  {post.author && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span>{post.author}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDownload(post.url)}
                disabled={isLoading}
                className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-terminal text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-amber-500 hover:text-amber-400 disabled:opacity-50"
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
