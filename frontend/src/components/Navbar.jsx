import { Link } from 'react-router-dom'

const navItems = [
	{ label: 'Home', to: '/' },
	{ label: 'How It Works', href: '#how-it-works' },
	{ label: 'Features', href: '#features' },
	{ label: 'Github', href: 'https://github.com/', external: true },
	{ label: 'Scan', to: '/scan', cta: true },
]

const Navbar = () => {
	return (
		<header className="navbar">
			<div className="navbar__brand">
				<Link className="navbar__logo-link navbar__wordmark" to="/" aria-label="SEOXray home">
					<span className="navbar__wordmark-mark" aria-hidden="true">◉</span>
					<span className="navbar__wordmark-text">SEOXray</span>
				</Link>
			</div>

			<nav className="navbar__nav" aria-label="Primary">
				{navItems.map((item) => (
					item.to ? (
						<Link
							key={item.label}
							className={item.cta ? 'navbar__link navbar__link--cta' : 'navbar__link'}
							to={item.to}
						>
							{item.label}
						</Link>
					) : (
						<a
							key={item.label}
							className={item.cta ? 'navbar__link navbar__link--cta' : 'navbar__link'}
							href={item.href}
							{...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
						>
							{item.label}
						</a>
					)
				))}
			</nav>
		</header>
	)
}

export default Navbar
