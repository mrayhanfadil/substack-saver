import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getErrorMessage,
  isValidUrl,
  type ConvertFormat,
} from '../lib/api'
import { downloadDestination, triggerDownload } from '../lib/download'

export interface HistoryEntry {
  id: string
  url: string
  format: ConvertFormat
  filename: string
  timestamp: number
}

const STORAGE_KEY = 'substack-saver-history'
const MAX_HISTORY = 20

/**
 * A form POST hands the download to the browser and never reports back, so
 * hold the busy state for a beat: long enough to be visible, short enough to
 * stay out of the way. It also blocks accidental double-taps on mobile.
 */
const DOWNLOAD_FEEDBACK_MS = 1500

/** Display name for the file the server is about to send. */
function filenameFor(target: string, format: ConvertFormat): string {
  const slug = target.replace(/https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 30)
  const ext = format === 'markdown' ? 'md' : format
  return `${slug}-${format}.${ext}`
}

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

  const convertingTimer = useRef<number | null>(null)
  const downloadingTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (convertingTimer.current !== null) window.clearTimeout(convertingTimer.current)
      if (downloadingTimer.current !== null) window.clearTimeout(downloadingTimer.current)
    }
  }, [])

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
      const filename = filenameFor(target, format)
      triggerDownload(target, format)
      pushHistory({ id: `${Date.now()}`, url: target, format, filename, timestamp: Date.now() })
      setNotice(`Downloading ${filename} — saves to ${downloadDestination()}.`)
    } catch (e) {
      setError(getErrorMessage(e))
    }

    if (convertingTimer.current !== null) window.clearTimeout(convertingTimer.current)
    convertingTimer.current = window.setTimeout(() => {
      convertingTimer.current = null
      setConverting(false)
    }, DOWNLOAD_FEEDBACK_MS)
  }, [url, format, pushHistory])

  const downloadPost = useCallback(
    (postUrl: string) => {
      setDownloadingUrl(postUrl)
      setError(null)
      setNotice(null)
      try {
        const filename = filenameFor(postUrl, format)
        triggerDownload(postUrl, format)
        pushHistory({ id: `${Date.now()}`, url: postUrl, format, filename, timestamp: Date.now() })
        setNotice(`Downloading ${filename} — saves to ${downloadDestination()}.`)
      } catch (e) {
        setError(getErrorMessage(e))
      }

      if (downloadingTimer.current !== null) window.clearTimeout(downloadingTimer.current)
      downloadingTimer.current = window.setTimeout(() => {
        downloadingTimer.current = null
        setDownloadingUrl(null)
      }, DOWNLOAD_FEEDBACK_MS)
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
