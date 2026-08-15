const puppeteer = require("puppeteer");

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_BROWSER_EVENTS = 100;
const MAX_RENDER_WAIT_MS = 5000;
let sharedBrowserPromise = null;

async function getSharedBrowser() {
	if (!sharedBrowserPromise) {
		sharedBrowserPromise = puppeteer.launch({
			headless: true
		});
	}

	return sharedBrowserPromise;
}

async function closeSharedBrowser() {
	if (!sharedBrowserPromise) {
		return;
	}

	try {
		const browser = await sharedBrowserPromise;
		await browser.close();
	} catch (error) {
		// Ignore close errors to keep shutdown safe.
	} finally {
		sharedBrowserPromise = null;
	}
}

function createBaseResult(requestedUrl) {
	return {
		url: requestedUrl,
		finalUrl: null,
		status: null,
		metadata: {
			title: "",
			description: "",
			robots: "",
			viewport: "",
			language: ""
		},
		headings: {
			h1: [],
			h2: [],
			h3: [],
			h4: [],
			h5: [],
			h6: []
		},
		images: [],
		links: {
			internal: [],
			external: []
		},
		canonical: "",
		openGraph: {
			title: "",
			description: "",
			image: "",
			url: "",
			type: ""
		},
		twitterCard: {
			card: "",
			title: "",
			description: "",
			image: ""
		},
		technical: {
			canonicalUrl: "",
			htmlLang: "",
			robotsMeta: ""
		},
		structuredData: [],
		browser: {
			consoleErrors: [],
			failedRequests: []
		},
		performance: {},
		scanError: null
	};
}

function classifyLinks(rawLinks, baseUrl) {
	const internal = [];
	const external = [];

	let baseOrigin = null;
	try {
		baseOrigin = new URL(baseUrl).origin;
	} catch (error) {
		baseOrigin = null;
	}

	for (const link of rawLinks) {
		const hrefValue = (link.href || "").trim();

		if (!hrefValue) {
			continue;
		}

		let normalizedHref = hrefValue;
		let resolvedUrl = null;
		let isExternal = false;

		try {
			resolvedUrl = new URL(hrefValue, baseUrl);
			normalizedHref = resolvedUrl.href;

			if (baseOrigin) {
				isExternal = resolvedUrl.origin !== baseOrigin;
			}
		} catch (error) {
			normalizedHref = hrefValue;
			isExternal = false;
		}

		const linkRecord = {
			href: normalizedHref,
			text: link.text,
			rel: link.rel,
			target: link.target
		};

		if (isExternal) {
			external.push(linkRecord);
		} else {
			internal.push(linkRecord);
		}
	}

	return { internal, external };
}

async function waitForRenderedContent(page, timeoutMs) {
	const renderTimeout = Math.min(MAX_RENDER_WAIT_MS, Math.max(1500, Math.floor(timeoutMs * 0.25)));
	const signalTimeout = Math.min(3000, Math.max(1000, Math.floor(timeoutMs * 0.15)));

	const waitTasks = [
		page.waitForFunction(() => document.readyState === "complete", { timeout: renderTimeout })
	];

	if (typeof page.waitForNetworkIdle === "function") {
		waitTasks.push(page.waitForNetworkIdle({ idleTime: 500, timeout: renderTimeout }));
	}

	await Promise.allSettled(waitTasks);

	await page
		.waitForFunction(
			() =>
				Boolean(
					document.querySelector(
						"h1, h2, img, meta[name='description'], script[type='application/ld+json']"
					)
				),
			{ timeout: signalTimeout }
		)
		.catch(() => {});
}

async function extractPageData(url, options = {}) {
	const {
		browser: providedBrowser,
		timeoutMs = DEFAULT_TIMEOUT_MS,
		waitUntil = "domcontentloaded"
	} = options;

	const result = createBaseResult(url);
	const consoleErrors = [];
	const failedRequests = [];

	let browser = providedBrowser || null;
	let page = null;

	try {
		if (!browser) {
			browser = await getSharedBrowser();
		}

		page = await browser.newPage();
		page.setDefaultNavigationTimeout(timeoutMs);
		page.setDefaultTimeout(timeoutMs);

		await page.setRequestInterception(true);
		page.on("request", request => {
			const requestUrl = request.url();

			if (!requestUrl.startsWith("http://") && !requestUrl.startsWith("https://")) {
				request.abort();
				return;
			}

			const type = request.resourceType();

			// Fonts and media are not required for fact extraction.
			if (type === "font" || type === "media" || type === "texttrack") {
				request.abort();
				return;
			}

			request.continue();
		});

		page.on("console", message => {
			if (message.type() !== "error") {
				return;
			}

			if (consoleErrors.length >= MAX_BROWSER_EVENTS) {
				return;
			}

			consoleErrors.push({
				text: message.text(),
				location: message.location()
			});
		});

		page.on("requestfailed", request => {
			if (failedRequests.length >= MAX_BROWSER_EVENTS) {
				return;
			}

			const failure = request.failure();
			const requestUrl = request.url().toLowerCase();
			const type = request.resourceType();
			let category = "other";

			if (type === "script") {
				category = requestUrl.includes("analytics") || requestUrl.includes("gtm") || requestUrl.includes("pixel") || requestUrl.includes("telemetry")
					? "analytics"
					: "script";
			} else if (type === "stylesheet") {
				category = "stylesheet";
			} else if (type === "image") {
				category = "image";
			} else if (requestUrl.includes("analytics") || requestUrl.includes("tracking") || requestUrl.includes("collector")) {
				category = "analytics";
			}

			failedRequests.push({
				url: request.url(),
				method: request.method(),
				resourceType: type,
				category,
				errorText: failure ? failure.errorText : "Request failed"
			});
		});

		const response = await page.goto(url, {
			waitUntil,
			timeout: timeoutMs
		});

		await waitForRenderedContent(page, timeoutMs);

		result.finalUrl = page.url();
		result.status = response ? response.status() : null;

		const redirectChain = response ? response.request().redirectChain() : [];
		const redirectCount = redirectChain.length;
		let isNormalRedirect = false;

		if (redirectCount === 1) {
			try {
				const initialObj = new URL(url);
				const finalObj = new URL(result.finalUrl);
				const initialCleanHost = initialObj.hostname.replace(/^www\./, "");
				const finalCleanHost = finalObj.hostname.replace(/^www\./, "");

				if (initialCleanHost === finalCleanHost) {
					isNormalRedirect = true;
				}
			} catch (err) {
				isNormalRedirect = false;
			}
		}

		const extracted = await page.evaluate(() => {
			const getMetaByName = name =>
				document
					.querySelector(`meta[name="${name}"]`)
					?.getAttribute("content")
					?.trim() || "";

			const getMetaByProperty = property =>
				document
					.querySelector(`meta[property="${property}"]`)
					?.getAttribute("content")
					?.trim() || "";

			const htmlLang = document.documentElement.getAttribute("lang")?.trim() || "";
			const robotsMeta = getMetaByName("robots");

			const headings = {
				h1: [],
				h2: [],
				h3: [],
				h4: [],
				h5: [],
				h6: []
			};

			document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(heading => {
				const tag = heading.tagName.toLowerCase();
				const text = (heading.textContent || "").trim();

				headings[tag].push(text);
			});

			const images = Array.from(document.querySelectorAll("img")).map(image => {
				const widthAttr = image.getAttribute("width");
				const heightAttr = image.getAttribute("height");
				const hasAltAttribute = image.hasAttribute("alt");

				return {
					src: image.getAttribute("src") || "",
					alt: hasAltAttribute ? image.getAttribute("alt") || "" : null,
					hasAltAttribute,
					width: widthAttr ? Number(widthAttr) || null : null,
					height: heightAttr ? Number(heightAttr) || null : null,
					loading: image.getAttribute("loading") || ""
				};
			});

			const links = Array.from(document.querySelectorAll("a")).map(anchor => ({
				href: anchor.getAttribute("href") || "",
				text: (anchor.textContent || "").trim(),
				rel: anchor.getAttribute("rel") || "",
				target: anchor.getAttribute("target") || ""
			}));

			const structuredData = Array.from(
				document.querySelectorAll('script[type="application/ld+json"]')
			)
				.map(script => (script.textContent || "").trim())
				.filter(Boolean)
				.map(raw => {
					try {
						return {
							raw,
							parsed: JSON.parse(raw)
						};
					} catch (error) {
						return {
							raw,
							parseError: "Invalid JSON-LD"
						};
					}
				});

			const canonical =
				document.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() || "";

			const bodyText = document.body ? (document.body.innerText || "").trim() : "";
			const lowerHtml = (document.documentElement ? document.documentElement.outerHTML : "").toLowerCase();
			const lowerTitle = (document.title || "").toLowerCase();

			const botVerificationDetected = Boolean(
				lowerTitle.includes("just a moment") ||
				lowerTitle.includes("attention required") ||
				lowerTitle.includes("captcha") ||
				lowerTitle.includes("access denied") ||
				lowerHtml.includes("cf-browser-verification") ||
				lowerHtml.includes("ray id:") ||
				lowerHtml.includes("enable javascript and cookies") ||
				lowerHtml.includes("verify you are human") ||
				lowerHtml.includes("ddos-guard")
			);

			const hasJsAppContainer = Boolean(
				document.querySelector('#root, #app, #__next, #__nuxt, app-root, [data-reactroot], script[id="__NEXT_DATA__"]')
			);
			const isSocialApp = Boolean(
				window.location.hostname.includes("instagram.com") ||
				window.location.hostname.includes("facebook.com") ||
				window.location.hostname.includes("threads.net")
			);

			let navigationPerformance = {};
			const perf = window.performance;
			const navigationEntry = perf && perf.getEntriesByType
				? perf.getEntriesByType("navigation")[0]
				: null;

			if (navigationEntry) {
				navigationPerformance = {
					type: navigationEntry.type,
					duration: navigationEntry.duration,
					domContentLoaded: navigationEntry.domContentLoadedEventEnd,
					loadEventEnd: navigationEntry.loadEventEnd,
					responseEnd: navigationEntry.responseEnd,
					transferSize: navigationEntry.transferSize,
					encodedBodySize: navigationEntry.encodedBodySize,
					decodedBodySize: navigationEntry.decodedBodySize
				};
			}

			return {
				metadata: {
					title: document.title?.trim() || "",
					description: getMetaByName("description"),
					robots: robotsMeta,
					viewport: getMetaByName("viewport"),
					language: htmlLang
				},
				headings,
				images,
				links,
				canonical,
				openGraph: {
					title: getMetaByProperty("og:title"),
					description: getMetaByProperty("og:description"),
					image: getMetaByProperty("og:image"),
					url: getMetaByProperty("og:url"),
					type: getMetaByProperty("og:type")
				},
				twitterCard: {
					card: getMetaByName("twitter:card"),
					title: getMetaByName("twitter:title"),
					description: getMetaByName("twitter:description"),
					image: getMetaByName("twitter:image")
				},
				technical: {
					canonicalUrl: canonical,
					htmlLang,
					robotsMeta,
					bodyTextLength: bodyText.length,
					hasJsAppContainer,
					isSocialApp,
					botVerificationDetected,
					elementCount: document.querySelectorAll("*").length
				},
				structuredData,
				performance: navigationPerformance
			};
		});

		result.metadata = extracted.metadata;
		result.headings = extracted.headings;
		result.images = extracted.images;
		result.canonical = extracted.canonical;
		result.openGraph = extracted.openGraph;
		result.twitterCard = extracted.twitterCard;
		result.technical = {
			...extracted.technical,
			redirectCount,
			isNormalRedirect
		};
		result.structuredData = extracted.structuredData;
		result.performance = extracted.performance;

		result.links = classifyLinks(extracted.links, result.finalUrl || url);
	} catch (error) {
		result.scanError = {
			name: error.name,
			message: error.message
		};
	} finally {
		result.browser.consoleErrors = consoleErrors;
		result.browser.failedRequests = failedRequests;

		if (page && !page.isClosed()) {
			await page.close().catch(() => {});
		}

	}

	return result;
}

module.exports = {
	extractPageData,
	closeSharedBrowser
};
