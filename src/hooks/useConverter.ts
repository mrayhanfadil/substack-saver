import { useCallback, useState } from 'react'
import {
  getErrorMessage,
  isValidUrl,
  type ConvertFormat,
} from '../lib/api'
import { triggerDownload } from '../lib/download'

export interface HistoryEntry {
  id: string
  url: string
  format: ConvertFormat
  filename: string
  timestamp: number
}

const STORAGE_KEY = 'substack-saver-history'
const MAX_HISTORY = 20

function isEntry(v: unknown): v is HistoryEntry {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.url === 'string' &&
    (o.format === 'pdf' || o.format === 'epub' || o.format === 'markdown') &&
    typeof o.filename === 'string' &&
    typeof o.timestamp === 'number'
  )
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry).slice(0, MAX_HISTORY)
  } catch {
    return []
  }
}

export function useConverter() {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState<ConvertFormat>('pdf')
  const [converting, setConverting] = useState(false)
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)

  const pushHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) => h.url !== entry.url || h.format !== entry.format)].slice(
        0,
        MAX_HISTORY,
      )
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable — history just won't persist */
      }
      return next
    })
  }, [])

  const convertCurrent = useCallback(async () => {
    const target = url.trim()
    if (!target) {
      setError('Paste a Substack URL to get started.')
      return
    }
    if (!isValidUrl(target)) {
      setError('That URL does not look valid. It should look like https://example.substack.com/p/some-post')
      return
    }
    setConverting(true)
    setError(null)
    setNotice(null)
    try {
      const slug = target.replace(/https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 30)
      const filename = `${slug}-${format}.${format === 'markdown' ? 'md' : format}`
      triggerDownload(target, format, filename)
      pushHistory({ id: `${Date.now()}`, url: target, format, filename, timestamp: Date.now() })
      setNotice(`Downloading ${filename}...`)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setConverting(false)
    }
  }, [url, format, pushHistory])

  const downloadPost = useCallback(
    async (postUrl: string) => {
      setDownloadingUrl(postUrl)
      setError(null)
      try {
        const slug = postUrl.replace(/https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 30)
        const filename = `${slug}-${format}.${format === 'markdown' ? 'md' : format}`
        triggerDownload(postUrl, format, filename)
        pushHistory({ id: `${Date.now()}`, url: postUrl, format, filename, timestamp: Date.now() })
        setNotice(`Downloading ${filename}...`)
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setDownloadingUrl(null)
      }
    },
    [format, pushHistory],
  )

  const clearHistory = useCallback(() => {
    setHistory([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const dismissMessages = useCallback(() => {
    setError(null)
    setNotice(null)
  }, [])

  return {
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
  }
}
