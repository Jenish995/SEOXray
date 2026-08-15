import { Link } from 'react-router-dom'
import './Home.css'

const highlights = [
	{ value: '10x', label: 'faster issue triage' },
	{ value: '90+', label: 'SEO checks' },
	{ value: '1 click', label: 'to start a scan' },
]

const features = [
	{
		title: 'Crawl with context',
		description: 'Inspect a site from the homepage and quickly see where technical SEO problems live.',
	},
	{
		title: 'Review the signal',
		description: 'Surface the most important issues first with a clear, dark interface that is easy to scan.',
	},
	{
		title: 'Act faster',
		description: 'Jump straight into the scan flow once you are ready to validate metadata, links, and structure.',
	},
]

const Home = () => {
	return (
		<main>
			<section id="home" className="hero hero--home">
				<div className="hero__content">
					<p className="eyebrow">Puppeteer-powered SEO auditing</p>
					<h1>See technical SEO issues before they cost you traffic.</h1>
					<p className="hero__copy">
						SEOXray crawls your site, spots on-page and technical issues, and turns them into clear next steps.
					</p>
					<div className="hero__actions">
						<Link className="button button--primary" to="/scan">
							Start a scan
						</Link>
						<a className="button button--secondary" href="#features">
							Explore features
						</a>
					</div>
				</div>

				<div className="hero__panel">
					<div className="hero__panel-card">
						<p className="section-kicker">Live overview</p>
						<div className="hero__stats">
							{highlights.map((item) => (
								<div key={item.label} className="hero__stat">
									<strong>{item.value}</strong>
									<span>{item.label}</span>
								</div>
							))}
						</div>
						<div className="hero__scan-preview">
							<span className="hero__scan-dot" />
							<div>
								<p>SEOXray ready</p>
								<span>Dark mode enabled for long audits and low-glare review.</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section id="how-it-works" className="content-section">
				<div className="content-section__card">
					<p className="section-kicker">How It Works</p>
					<h2>Crawl, detect, and prioritize.</h2>
					<p>
						Run a scan against your site, inspect the findings, and act on the highest-impact issues first.
					</p>
				</div>
			</section>

			<section id="features" className="content-section content-section--grid">
				{features.map((feature) => (
					<article key={feature.title} className="feature-card">
						<p className="section-kicker">Features</p>
						<h2>{feature.title}</h2>
						<p>{feature.description}</p>
					</article>
				))}
			</section>
		</main>
	)
}

export default Home
