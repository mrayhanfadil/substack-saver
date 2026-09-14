/**
 * Trigger a file download via a hidden form POST.
 * Works on iOS Safari (blob URLs don't).
 */
export function triggerDownload(url: string, format: string, _filenameHint: string) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = '/api/download'
  form.style.display = 'none'

  const urlInput = document.createElement('input')
  urlInput.type = 'hidden'
  urlInput.name = 'url'
  urlInput.value = url
  form.appendChild(urlInput)

  const fmtInput = document.createElement('input')
  fmtInput.type = 'hidden'
  fmtInput.name = 'format'
  fmtInput.value = format
  form.appendChild(fmtInput)

  document.body.appendChild(form)
  form.submit()

  // Clean up after a short delay
  setTimeout(() => form.remove(), 1000)
}
