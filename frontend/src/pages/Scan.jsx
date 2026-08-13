import { useState } from 'react'
import { validateUrl } from '../utils/urlValidation'

const Scan = () => {
	const [urls, setUrls] = useState('')
	const [error, setError] = useState('')
	const [isSubmitted, setIsSubmitted] = useState(false)

	const steps = [
		{ label: 'Connecting to website', done: true },
		{ label: 'Loading page', done: true },
		{ label: 'Analyzing metadata', done: true },
		{ label: 'Checking headings', done: true },
		{ label: 'Checking images', done: false, active: true },
		{ label: 'Checking links', done: false },
		{ label: 'Calculating SEO score', done: false },
	]

	const handleSubmit = (event) => {
		event.preventDefault()
		setIsSubmitted(true)

		const validationError = validateUrl(urls)

		if (validationError) {
			setError(validationError)
			return
		}

		setError('')

		console.log('URL is valid:', urls)

		// Start your scan here
	}

	const handleUrlChange = (event) => {
		const nextUrl = event.target.value
		setUrls(nextUrl)

		if (isSubmitted) {
			setError(validateUrl(nextUrl))
		}
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
									onBlur={() => {
										setIsSubmitted(true)
										setError(validateUrl(urls))
									}}
									placeholder="https://example.com"
									aria-label="Website URL to scan"
									aria-invalid={Boolean(error)}
									aria-describedby={error ? 'scan-url-error' : undefined}
								/>
							</div>
							<button type="submit" className="button button--primary scan-page__url-submit">
								Start scan
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
							<span className="scan-page__progress-fill" />
						</div>
						<p className="scan-page__progress-text">72%</p>
					</div>
					<p className="scan-page__status">Scanning website...</p>
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
