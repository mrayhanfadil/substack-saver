import { Download, ExternalLink, Loader2 } from 'lucide-react'
import type { ConvertFormat, PostItem } from '../lib/api'

interface PostListProps {
  posts: PostItem[]
  pubName: string
  format: ConvertFormat
  downloadingUrl: string | null
  onDownload: (url: string) => void
}

export default function PostList({
  posts,
  pubName,
  format,
  downloadingUrl,
  onDownload,
}: PostListProps) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-[color:var(--color-rule)] pb-3">
        <div className="min-w-0">
          <div className="font-display text-base font-medium leading-tight text-[color:var(--color-ink)]">
            {pubName}
          </div>
          <div className="mt-0.5 text-xs text-[color:var(--color-pencil-soft)]">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </div>
        </div>
      </div>

      <ol className="scroll-thin space-y-0 sm:max-h-96 sm:overflow-y-auto sm:pr-1">
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
            <li
              key={`${post.url}-${i}`}
              className="group flex items-start gap-3 border-b border-[color:var(--color-rule-soft)] py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 font-display text-[15px] font-medium leading-snug text-[color:var(--color-ink)] transition-colors hover:underline hover:decoration-[color:var(--color-ink)] hover:underline-offset-4"
                >
                  {post.title}
                  <ExternalLink
                    className="ml-1 inline h-3 w-3 align-baseline text-[color:var(--color-pencil-soft)] opacity-60 transition-opacity group-hover:opacity-100 sm:opacity-0"
                    strokeWidth={1.5}
                  />
                </a>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[color:var(--color-pencil-soft)]">
                  {dateStr && <span>{dateStr}</span>}
                  {post.author && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{post.author}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDownload(post.url)}
                disabled={isLoading}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-center rounded-md border border-[color:var(--color-rule)] bg-transparent px-3 py-1.5 text-xs font-medium text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)] hover:bg-[color:var(--color-paper-soft)] disabled:opacity-50 sm:min-h-0"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
                <span className="uppercase tracking-wider">{format}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
