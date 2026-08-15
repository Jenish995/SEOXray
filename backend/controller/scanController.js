const { validateSeoUrl } = require("../validator/urlvalidator");
const { extractPageData } = require("../crawler/pageExtractor");
const { analyzeSeo } = require("../seo/analyzer");
const { calculateSeoScore } = require("../seo/scoring");

function getValidationStatusCode(errorMessage) {
	const message = String(errorMessage || "").toLowerCase();

	if (
		message.includes("unsafe") ||
		message.includes("private") ||
		message.includes("loopback") ||
		message.includes("local") ||
		message.includes("not safe") ||
		message.includes("not allowed")
	) {
		return 403;
	}

	return 400;
}

function mapScanFailure(errorInfo) {
	const message = String(errorInfo?.message || "").toLowerCase();

	if (message.includes("timeout")) {
		return {
			status: 504,
			error: "The target website took too long to respond."
		};
	}

	if (
		message.includes("net::err_name_not_resolved") ||
		message.includes("net::err_connection_refused") ||
		message.includes("net::err_connection_timed_out") ||
		message.includes("net::err_failed")
	) {
		return {
			status: 502,
			error: "Unable to connect to the target website for scanning."
		};
	}

	return {
		status: 502,
		error: "Scanning failed while loading the target website."
	};
}

function createScanController(deps = {}) {
	const validate = deps.validateSeoUrl || validateSeoUrl;
	const extract = deps.extractPageData || extractPageData;
	const analyze = deps.analyzeSeo || analyzeSeo;
	const score = deps.calculateSeoScore || calculateSeoScore;

	return async function scanController(req, res) {
		try {
			const { url } = req.body || {};

			if (typeof url !== "string" || !url.trim()) {
				return res.status(400).json({
					success: false,
					error: "Please enter a website URL."
				});
			}

			const validation = await validate(url);

			if (!validation.ok || !validation.safe) {
				const status = getValidationStatusCode(validation.error);
				return res.status(status).json({
					success: false,
					error: validation.error || "This URL is not safe to crawl."
				});
			}

			const extraction = await extract(validation.url);

			if (extraction.scanError) {
				const failure = mapScanFailure(extraction.scanError);
				return res.status(failure.status).json({
					success: false,
					error: failure.error
				});
			}

			const analysis = analyze(extraction);
			const scoreResult = score(analysis);

			return res.status(200).json({
				success: true,
				scan: {
					url: extraction.url,
					finalUrl: extraction.finalUrl,
					status: extraction.status
				},
				score: scoreResult.score,
				summary: scoreResult.summary,
				coreSeo: analysis.summary?.coreSeo || {
					passed: analysis.summary?.passed || 0,
					warnings: analysis.summary?.warnings || 0,
					critical: analysis.summary?.critical || 0
				},
				socialSharing: {
					openGraph: analysis.summary?.socialSharing?.openGraph || "Passed",
					twitterCard: analysis.summary?.socialSharing?.twitterCard || "Passed"
				},
				structuredData: {
					exists: extraction.structuredData.length > 0,
					count: extraction.structuredData.length,
					items: extraction.structuredData,
					status: extraction.structuredData.length > 0 ? "Detected" : "Not detected (Info)"
				},
				jsRendering: {
					mayRequireJs: Boolean(analysis.mayRequireJs),
					notice: analysis.diagnostics?.find(d => d.id === "js-rendering-required")?.message || null
				},
				metadata: extraction.metadata,
				headings: extraction.headings,
				images: {
					total: extraction.images.length,
					items: extraction.images
				},
				links: {
					internal: extraction.links.internal,
					external: extraction.links.external,
					counts: {
						internal: extraction.links.internal.length,
						external: extraction.links.external.length
					}
				},
				technical: {
					canonical: extraction.canonical,
					htmlLang: extraction.technical.htmlLang,
					robots: extraction.technical.robotsMeta,
					viewport: extraction.metadata.viewport,
					https: extraction.finalUrl ? extraction.finalUrl.startsWith("https://") : false,
					redirected:
						Boolean(extraction.finalUrl) && extraction.finalUrl !== extraction.url
				},
				social: {
					openGraph: extraction.openGraph,
					twitterCard: extraction.twitterCard
				},
				browser: extraction.browser,
				performance: extraction.performance,
				diagnostics: analysis.diagnostics || [],
				issues: analysis.issues,
				analysisSummary: analysis.summary
			});
		} catch (error) {
			return res.status(500).json({
				success: false,
				error: "Unexpected server error during scan."
			});
		}
	};
}

module.exports = {
	createScanController,
	scanController: createScanController()
};
