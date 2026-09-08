import axios from 'axios'

export type ConvertFormat = 'pdf' | 'epub' | 'markdown'

export interface PostItem {
  title: string
  url: string
  date: string
  author: string
}

export interface PublicationResponse {
  posts: PostItem[]
}

// Same-origin: the FastAPI backend serves this bundle and exposes /api.
const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

export async function convertPost(url: string, format: ConvertFormat): Promise<Blob> {
  const res = await api.post('/download', { url, format }, { responseType: 'blob' })
  return res.data as Blob
}

export function filenameFromUrl(url: string, format: ConvertFormat): string {
  const ext = format === 'markdown' ? 'md' : format
  try {
    const u = new URL(url)
    const slug = u.pathname.split('/').filter(Boolean).pop() ?? 'post'
    const safe = slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
    return `${safe || 'post'}.${ext}`
  } catch {
    return `post.${ext}`
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objUrl), 5000)
}

export async function fetchPublication(subdomain: string): Promise<PublicationResponse> {
  const res = await api.get<PublicationResponse>(`/publication/${encodeURIComponent(subdomain)}`)
  return res.data
}

export async function checkHealth(): Promise<unknown> {
  const res = await api.get('/health')
  return res.data
}

/** Extract the publication identifier from any Substack URL. */
export function extractSubdomain(input: string): string | null {
  let host: string
  try {
    const u = new URL(input.includes('://') ? input : `https://${input}`)
    host = u.hostname.toLowerCase()
  } catch {
    return null
  }
  const m = host.match(/^([a-z0-9-]+)\.substack\.com$/)
  if (m) return m[1]
  return host
}

/** True when the URL is a publication root (no post path), e.g. https://stratechery.com */
export function isPublicationUrl(input: string): boolean {
  try {
    const u = new URL(input.includes('://') ? input : `https://${input}`)
    return u.pathname.split('/').filter(Boolean).length === 0
  } catch {
    return false
  }
}

export function isValidUrl(input: string): boolean {
  try {
    const u = new URL(input.includes('://') ? input : `https://${input}`)
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    if (status === 429) return 'Rate limited — too many requests. Wait a minute and try again.'
    if (status === 404) return 'Not found — check the URL and try again.'
    if (status === 400) return 'Invalid request — check the URL and try again.'
    if (status !== undefined && status >= 500)
      return 'Conversion failed on the server. Try again in a moment.'
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT')
      return 'Request timed out. The post may be large — try again.'
    if (err.message === 'Network Error')
      return 'Cannot reach the server. Make sure the backend is running.'
    const data: unknown = err.response?.data
    if (typeof data === 'object' && data !== null && 'error' in data) {
      return String((data as Record<string, unknown>).error)
    }
    if (typeof data === 'string' && data.length > 0 && data.length < 300) return data
    return err.message || 'Conversion failed. Try again.'
  }
  if (err instanceof Error && err.message) return err.message
  return 'Something went wrong. Try again.'
}
