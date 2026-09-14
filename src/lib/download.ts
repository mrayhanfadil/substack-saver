/**
 * Trigger a file download with a hidden form POST.
 *
 * iOS Safari ignores `a[download]` and refuses to save blob URLs, so the only
 * reliable cross-platform path is a native form POST whose response carries
 * `Content-Disposition: attachment`. It also streams the file through the
 * browser instead of buffering it in JS memory, which matters on phones with
 * long, image-heavy posts.
 */
export function triggerDownload(url: string, format: string): void {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = '/api/download'
  form.style.display = 'none'

  const fields: Record<string, string> = { url, format }
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }

  document.body.appendChild(form)
  form.submit()

  // The submit is synchronous; drop the node once the browser has it.
  window.setTimeout(() => form.remove(), 1000)
}

/** True on iOS / iPadOS. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac — touch points give it away.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/** Where the browser drops the file, so the UI can say where to look. */
export function downloadDestination(): string {
  return isIOS() ? 'Files → Downloads' : 'your Downloads folder'
}
