export const validateUrl = async (value) => {
  const trimmedValue = value?.trim() ?? ''

  if (!trimmedValue) {
    return 'Please enter a website URL.'
  }

  let url

  try {
    url = new URL(trimmedValue)
  } catch {
    return 'Please enter a valid URL, e.g. https://example.com'
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return 'URL must use http:// or https://'
  }

  if (!url.hostname) {
    return 'Please enter a valid website domain.'
  }

  try {
    const response = await fetch('http://localhost:5000/api/validate-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: trimmedValue }),
    })

    const result = await response.json()

    if (!response.ok) {
      return result?.error || 'This URL is not safe to crawl.'
    }

    return ''
  } catch {
    return 'Unable to validate this URL right now. Please try again.'
  }
}
