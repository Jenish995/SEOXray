import { useState } from 'react'
import { validateUrl } from '../utils/urlValidation'
import './Scan.css'

const Scan = () => {
  const [urls, setUrls] = useState('')
  const [error, setError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isUrlValid, setIsUrlValid] = useState(false)

  const isLoading = isValidating && urls.trim() !== ''

  const steps = [
    { label: 'Connecting to website', done: true },
    { label: 'Loading page', done: true },
    { label: 'Analyzing metadata', done: true },
    { label: 'Checking headings', done: true },
    { label: 'Checking images', done: false, active: true },
    { label: 'Checking links', done: false },
    { label: 'Calculating SEO score', done: false },
  ]

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitted(true)
    setIsValidating(true)
    setIsUrlValid(false)

    const validationError = await validateUrl(urls)

    setIsValidating(false)

    if (validationError) {
      setError(validationError)
      setIsUrlValid(false)
      return
    }

    setError('')
    setIsUrlValid(true)
    console.log('URL is valid:', urls)
  }

  const handleUrlChange = async (event) => {
    const nextUrl = event.target.value
    setUrls(nextUrl)

    if (!nextUrl.trim()) {
      setIsSubmitted(false)
      setIsValidating(false)
      setError('')
      setIsUrlValid(false)
      return
    }

    setIsSubmitted(true)
    setIsValidating(true)
    setError('')

    const validationError = await validateUrl(nextUrl)

    setIsValidating(false)
    setError(validationError)
    setIsUrlValid(!validationError)
  }

  return (
    <section id="scan" className="scan-page">
      <div className="scan-page__frame">
        <div className="scan-page__hero">
          <p className="scan-page__eyebrow">Website Scan</p>
          <h2>Analyzing your website...</h2>
          <form className="scan-page__url-form" onSubmit={handleSubmit}>
            <div className="scan-page__url-row">
              <div className="scan-page__url-card">
                <span className="scan-page__url-icon">🔗</span>
                <input
                  id="scan-urls"
                  className="scan-page__url-input"
                  value={urls}
                  onChange={handleUrlChange}
                  onBlur={async () => {
                    const trimmedUrl = urls.trim()

                    if (!trimmedUrl) {
                      setIsSubmitted(false)
                      setIsValidating(false)
                      setError('')
                      setIsUrlValid(false)
                      return
                    }

                    setIsSubmitted(true)
                    setIsValidating(true)
                    setIsUrlValid(false)
                    const validationError = await validateUrl(urls)
                    setIsValidating(false)
                    setError(validationError)
                    setIsUrlValid(!validationError)
                  }}
                  placeholder="https://example.com"
                  aria-label="Website URL to scan"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'scan-url-error' : undefined}
                />
              </div>
              <button
                type="submit"
                className="button button--primary scan-page__url-submit"
                disabled={isValidating}
              >
                {isValidating ? 'Validating...' : 'Start scan'}
              </button>
            </div>
          </form>
          {error ? (
            <p id="scan-url-error" className="scan-form__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="scan-page__progress-wrap" aria-label="Scan progress">
            <div className="scan-page__progress-bar">
              <span className="scan-page__progress-fill scan-page__progress-fill--idle" />
            </div>
            <p className="scan-page__progress-text">0%</p>
          </div>
          <p
            className={
              `scan-page__status ${isUrlValid ? 'scan-page__status--success' : ''} ${isLoading ? 'scan-page__status--loading' : ''}`
            }
          >
            <span className="scan-page__status-indicator" aria-hidden="true">
              {isUrlValid ? '✓' : '⏳'}
            </span>
            {isUrlValid ? 'Valid URL' : 'Scanning URL...'}
          </p>
        </div>

        <div className="scan-page__content">
          <section className="scan-card scan-card--progress">
            <p className="scan-card__title">Scan Progress</p>
            <ul className="scan-step-list">
              {steps.map((step) => (
                <li
                  key={step.label}
                  className={
                    step.active
                      ? 'scan-step scan-step--active'
                      : step.done
                        ? 'scan-step scan-step--done'
                        : 'scan-step'
                  }
                >
                  <span className="scan-step__icon" aria-hidden="true">
                    {step.done ? '✓' : step.active ? '●' : '○'}
                  </span>
                  <span>{step.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="scan-card scan-card--preview">
            <p className="scan-card__title">Currently Analyzing</p>
            <div className="scan-preview">
              <div className="scan-preview__screen">
                <div className="scan-preview__screen-inner">
                  <p>Website Preview</p>
                  <span>/ Screenshot</span>
                </div>
              </div>
            </div>
            <div className="scan-form scan-form--compact">
              <div className="scan-form__actions">
                <p className="scan-form__hint">Paste the website URL you want to audit and connect it to the scan workflow.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}

export default Scan
