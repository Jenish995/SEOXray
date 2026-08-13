export const validateUrl = (value) => {
	if (!value || !value.trim()) {
		return 'Please enter a website URL.'
	}

	try {
		const url = new URL(value.trim())

		if (!['http:', 'https:'].includes(url.protocol)) {
			return 'URL must use http:// or https://'
		}

		if (!url.hostname.includes('.')) {
			return 'Please enter a valid website domain.'
		}

		return ''
	} catch {
		return 'Please enter a valid URL, e.g. https://example.com'
	}
}
