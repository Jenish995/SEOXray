import { useState } from 'react'
import { validateUrl } from '../utils/urlValidation'
import './Scan.css'

const Scan = () => {
  const [urls, setUrls] = useState('')
  const [error, setError] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isUrlValid, setIsUrlValid] = useState(false)
  const [scanResult, setScanResult] = useState(null)

  const isLoading = isValidating || isScanning

  const scanChecks = [
    'Connecting to website',
    'Loading page',
    'Extracting SEO information',
    'Analyzing metadata and structure',
    'Checking images and links',
    'Calculating Technical SEO Audit Score',
  ]

  const runScan = async (validatedUrl) => {
    setIsScanning(true)
    setScanResult(null)

    try {
      const response = await fetch('http://localhost:5000/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: validatedUrl }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(payload?.error || 'Scan failed. Please try again.')
        setIsUrlValid(false)
        return
      }

      setError('')
      setIsUrlValid(true)
      setScanResult(payload)
    } catch {
      setError('Unable to complete scan right now. Please try again.')
      setIsUrlValid(false)
    } finally {
      setIsScanning(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsValidating(true)
    setIsUrlValid(false)
    setError('')

    const validationError = await validateUrl(urls)

    if (validationError) {
      setIsValidating(false)
      setError(validationError)
      setIsUrlValid(false)
      return
    }

    await runScan(urls.trim())
    setIsValidating(false)
  }

  const handleUrlChange = async (event) => {
    const nextUrl = event.target.value
    setUrls(nextUrl)
    setScanResult(null)

    if (!nextUrl.trim()) {
      setIsValidating(false)
      setError('')
      setIsUrlValid(false)
      return
    }

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
                      setIsValidating(false)
                      setError('')
                      setIsUrlValid(false)
                      return
                    }

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
                disabled={isLoading}
              >
                {isValidating ? 'Validating...' : isScanning ? 'Scanning...' : 'Start scan'}
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
              <span
                className={`scan-page__progress-fill ${isLoading ? 'scan-page__progress-fill--running' : 'scan-page__progress-fill--idle'}`}
              />
            </div>
            <p className="scan-page__progress-text">
              {isScanning ? 'Scanning...' : isUrlValid ? 'Ready' : 'Idle'}
            </p>
          </div>
          <p
            className={
              `scan-page__status ${isUrlValid ? 'scan-page__status--success' : ''} ${isLoading ? 'scan-page__status--loading' : ''}`
            }
          >
            <span className="scan-page__status-indicator" aria-hidden="true">
              {isUrlValid && !isLoading ? '✓' : '⏳'}
            </span>
            {isScanning
              ? 'Running one-page SEO scan...'
              : isValidating
                ? 'Validating URL...'
                : isUrlValid
                  ? 'Scan complete'
                  : 'Waiting for URL'}
          </p>
        </div>

        <div className="scan-page__content">
          <section className="scan-card scan-card--progress">
            <p className="scan-card__title">Scan Progress</p>
            <ul className="scan-step-list">
              {scanChecks.map((step) => (
                <li
                  key={step}
                  className={isScanning ? 'scan-step scan-step--active' : 'scan-step'}
                >
                  <span className="scan-step__icon" aria-hidden="true">
                    {isScanning ? '●' : '○'}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="scan-card scan-card--preview">
            <p className="scan-card__title">Analysis Report</p>
            <div className="scan-form scan-form--compact">
              <div className="scan-form__actions">
                {!scanResult ? (
                  <p className="scan-form__hint">Paste the website URL you want to audit and run a one-page SEO scan.</p>
                ) : (
                  <div className="scan-report">
                    <div className="scan-report__header">
                      <div className="scan-report__score-box">
                        <div className="scan-report__score-title">{scanResult.score?.label || 'Technical SEO Audit Score'}</div>
                        <div className="scan-report__score-row">
                          <span className="scan-report__score-value">{scanResult.score?.value ?? 0}<small>/100</small></span>
                          <span className="scan-report__score-grade">Grade: <strong>{scanResult.score?.grade || 'N/A'}</strong></span>
                        </div>
                      </div>
                      <div className="scan-report__confidence-box">
                        <span className="scan-report__confidence-title">Audit Confidence</span>
                        <span className={`confidence-badge confidence-badge--${(scanResult.confidence?.rating || 'High').toLowerCase()}`}>
                          {scanResult.confidence?.score ?? 100}%
                          <span className="confidence-badge__tier">
                            {scanResult.confidence?.status === 'UNRELIABLE_AUDIT' ? 'Unreliable'
                              : scanResult.confidence?.status === 'PARTIAL_AUDIT' ? 'Partial'
                              : 'Full'} Audit
                          </span>
                        </span>
                      </div>
                      <div className="scan-report__page-meta">
                        <p className="scan-report__meta-line" title={scanResult.scan?.finalUrl || scanResult.scan?.url}>
                          <strong>Page:</strong> {scanResult.scan?.finalUrl || scanResult.scan?.url}
                        </p>
                        <p className="scan-report__meta-line">
                          <strong>Title:</strong> {scanResult.metadata?.title || 'No title found'}
                        </p>
                      </div>
                    </div>

                    <p className="scan-report__disclaimer">
                      ℹ️ {scanResult.score?.explanation || "This is an audit score based on technical and on-page SEO checks performed by our tool. It does not represent your Google ranking, Search Console performance, or Google's assessment of your website."}
                    </p>

                    {scanResult.confidence?.status === 'UNRELIABLE_AUDIT' && (
                      <div className="scan-report__notice scan-report__notice--unreliable">
                        <span className="scan-report__notice-icon">🚫</span>
                        <div>
                          <strong>Unreliable Audit:</strong> The crawler encountered a bot challenge or security restriction. Page-level findings may be incomplete or inaccurate. Audit results cannot be fully trusted for this scan.
                          {scanResult.confidence?.signals?.length > 0 && (
                            <ul className="confidence-signals">
                              {scanResult.confidence.signals.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}

                    {scanResult.confidence?.status === 'PARTIAL_AUDIT' && (
                      <div className="scan-report__notice scan-report__notice--partial">
                        <span className="scan-report__notice-icon">⚠️</span>
                        <div>
                          <strong>Partial Audit:</strong> Some crawl signals suggest the page may not have been fully accessible or requires JavaScript rendering. Results should be interpreted with caution.
                        </div>
                      </div>
                    )}

                    {scanResult.jsRendering?.mayRequireJs || scanResult.jsRendering?.notice ? (
                      <div className="scan-report__notice scan-report__notice--js">
                        <span className="scan-report__notice-icon">⚠️</span>
                        <div>
                          <strong>Potential issue:</strong> {scanResult.jsRendering?.notice || 'This page may require JavaScript rendering for a complete SEO analysis.'}
                        </div>
                      </div>
                    ) : null}

                    <div className="scan-report__grid">
                      <div className="scan-report__group">
                        <h4 className="scan-report__group-title">Core SEO</h4>
                        <div className="scan-report__stat-row">
                          <span className="stat-pill stat-pill--passed">Passed: {scanResult.coreSeo?.passed ?? scanResult.summary?.passed ?? 0}</span>
                          <span className="stat-pill stat-pill--warning">Warnings: {scanResult.coreSeo?.warnings ?? scanResult.summary?.warnings ?? 0}</span>
                          <span className="stat-pill stat-pill--critical">Critical: {scanResult.coreSeo?.critical ?? scanResult.summary?.critical ?? 0}</span>
                        </div>
                      </div>

                      <div className="scan-report__group">
                        <h4 className="scan-report__group-title">Social Sharing</h4>
                        <div className="scan-report__status-list">
                          <div className="scan-report__status-item">
                            <span>Open Graph:</span>
                            <span className={`status-badge status-badge--${(scanResult.socialSharing?.openGraph || 'Passed').toLowerCase()}`}>
                              {scanResult.socialSharing?.openGraph || 'Passed'}
                            </span>
                          </div>
                          <div className="scan-report__status-item">
                            <span>Twitter Card:</span>
                            <span className={`status-badge status-badge--${(scanResult.socialSharing?.twitterCard || 'Passed').toLowerCase()}`}>
                              {scanResult.socialSharing?.twitterCard || 'Passed'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="scan-report__group">
                        <h4 className="scan-report__group-title">Structured Data</h4>
                        <div className="scan-report__status-list">
                          <div className="scan-report__status-item">
                            <span>JSON-LD:</span>
                            <span className="status-badge status-badge--info">
                              {scanResult.structuredData?.exists 
                                ? `Detected (${scanResult.structuredData.count})` 
                                : 'Not detected (Info)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="scan-issues">
                      <p className="scan-issues__header"><strong>Audit Findings ({scanResult.issues?.length || 0}):</strong></p>
                      <ul className="scan-issues__list">
                        {(scanResult.issues || []).map((issue) => (
                          <li key={issue.id} className={`scan-issues__item scan-issues__item--${issue.severity}`}>
                            <div className="scan-issues__item-top">
                              <span className={`scan-issues__severity scan-issues__severity--${issue.severity}`}>
                                {issue.severity.toUpperCase()}
                              </span>
                              <span className="scan-issues__category">
                                {issue.category}
                              </span>
                              <strong className="scan-issues__title">{issue.title}</strong>
                            </div>
                            <p className="scan-issues__message">{issue.message}</p>
                            {issue.recommendation && (
                              <p className="scan-issues__recommendation">
                                💡 <em>{issue.recommendation}</em>
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}

export default Scan
