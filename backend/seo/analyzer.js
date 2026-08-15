function createIssue(id, category, severity, title, message, recommendation, extra = {}) {
  return {
    id,
    category,
    severity,
    title,
    message,
    recommendation,
    ...extra
  };
}

function isBlank(value) {
  return !String(value || "").trim();
}

function calculateAuditConfidence(data, issues, mayRequireJs) {
  let score = 100;
  const signals = [];

  const botVerification = Boolean(data?.technical?.botVerificationDetected);
  const status = data?.status;
  const bodyTextLength = data?.technical?.bodyTextLength ?? 1000;
  const failedRequests = data?.browser?.failedRequests || [];
  const initialUrl = data?.url || "";
  const finalUrl = data?.finalUrl || "";
  const redirectCount = data?.technical?.redirectCount || 0;
  const isNormalRedirect = Boolean(data?.technical?.isNormalRedirect);

  if (botVerification) {
    score -= 45;
    signals.push("Bot verification or security challenge page detected");
  } else {
    if (bodyTextLength < 50 && mayRequireJs) {
      score -= 20;
      signals.push("Sparse static HTML content (<50 characters) requiring JavaScript rendering");
    } else if (bodyTextLength < 50) {
      score -= 25;
      signals.push("Sparse HTML body text detected (<50 characters)");
    }
  }

  if (typeof status === "number" && status >= 400) {
    score -= 35;
    signals.push(`HTTP response status code indicates an error (${status})`);
  } else if (status == null) {
    score -= 25;
    signals.push("HTTP response status code was unconfirmed");
  }

  if (redirectCount > 2) {
    score -= 20;
    signals.push(`Target URL underwent a multi-step redirect chain (${redirectCount} hops)`);
  } else if (redirectCount > 0 && !isNormalRedirect && initialUrl !== finalUrl) {
    score -= 10;
    signals.push("Target URL redirected during scan");
  }

  const criticalScriptFailures = failedRequests.filter(
    r => r.category === "script" || r.category === "stylesheet"
  ).length;

  if (criticalScriptFailures >= 3) {
    score -= 15;
    signals.push(`${criticalScriptFailures} critical script/stylesheet network requests failed`);
  }

  const finalScore = Math.max(10, Math.min(100, score));
  let statusTier = "FULL_AUDIT";
  let rating = "High";

  if (finalScore < 65) {
    statusTier = "UNRELIABLE_AUDIT";
    rating = "Low";
  } else if (finalScore < 85) {
    statusTier = "PARTIAL_AUDIT";
    rating = "Medium";
  }

  return {
    score: finalScore,
    status: statusTier,
    rating,
    signals
  };
}

function analyzeSeo(extracted) {
  const data = extracted || {};
  const issues = [];
  const diagnostics = [];

  const title = data?.metadata?.title || "";
  const description = data?.metadata?.description || "";
  const robotsMeta = (data?.metadata?.robots || "").toLowerCase();
  const viewport = data?.metadata?.viewport || "";
  const h1 = data?.headings?.h1 || [];
  const allHeadings = ["h1", "h2", "h3", "h4", "h5", "h6"]
    .flatMap(tag => data?.headings?.[tag] || []);
  const images = data?.images || [];
  const internalLinks = data?.links?.internal || [];
  const externalLinks = data?.links?.external || [];
  const canonical = data?.canonical || "";
  const openGraph = data?.openGraph || {};
  const twitterCard = data?.twitterCard || {};
  const structuredData = data?.structuredData || [];
  const finalUrl = data?.finalUrl || data?.url || "";
  const status = data?.status;

  const bodyTextLength = data?.technical?.bodyTextLength;
  const hasJsAppContainer = Boolean(data?.technical?.hasJsAppContainer);
  const isSocialApp = Boolean(
    data?.technical?.isSocialApp ||
    (finalUrl && (finalUrl.includes("instagram.com") || finalUrl.includes("facebook.com") || finalUrl.includes("threads.net")))
  );

  const mayRequireJs = Boolean(
    isSocialApp ||
    (hasJsAppContainer && (bodyTextLength !== undefined && bodyTextLength < 100)) ||
    (isBlank(title) && h1.length === 0 && (hasJsAppContainer || isSocialApp))
  );

  const isBotChallenge = Boolean(data?.technical?.botVerificationDetected);

  if (isBotChallenge) {
    issues.push(
      createIssue(
        "bot-verification-detected",
        "Technical SEO",
        "critical",
        "Bot protection or CAPTCHA challenge encountered",
        "The crawler received a security challenge or bot verification page instead of actual site content.",
        "Ensure search crawler user agents are allowed or audit in an unblocked environment."
      )
    );
  }

  if (mayRequireJs) {
    diagnostics.push(
      createIssue(
        "js-rendering-required",
        "Technical Diagnostics",
        "info",
        "JavaScript rendering may be required",
        "Potential issue: This page may require JavaScript rendering for a complete SEO analysis.",
        "Verify if content is rendered dynamically via client-side JavaScript."
      )
    );
  }

  if (isBlank(title)) {
    if (!isBotChallenge) {
      issues.push(
        createIssue(
          "missing-title",
          "Metadata",
          "high",
          "Title tag is missing",
          mayRequireJs
            ? "The page title is empty or not present in initial HTML. Not detected because the page may require JavaScript rendering."
            : "The page title is empty or not present.",
          "Add a unique title tag that describes the page intent.",
          { detectionState: mayRequireJs ? "requires_javascript" : "definitely_missing" }
        )
      );
    }
  } else {
    if (title.trim().length > 60) {
      issues.push(
        createIssue(
          "title-too-long",
          "Metadata",
          "medium",
          "Title length exceeds snippet guidelines",
          "Title is over 60 characters. Search engines may truncate or rewrite very long titles in search result snippets.",
          "Treat 50–60 characters as a display guideline to prevent snippet truncation."
        )
      );
    }
  }

  if (isBlank(description)) {
    if (!isBotChallenge) {
      issues.push(
        createIssue(
          "missing-meta-description",
          "Metadata",
          "medium",
          "Meta description is missing",
          mayRequireJs
            ? "No meta description was found in initial HTML. Not detected because the page may require JavaScript rendering."
            : "No meta description was found on this page.",
          "Add a concise meta description summarizing page intent.",
          { detectionState: mayRequireJs ? "requires_javascript" : "definitely_missing" }
        )
      );
    }
  } else {
    if (description.trim().length < 50) {
      issues.push(
        createIssue(
          "meta-description-too-short",
          "Metadata",
          "medium",
          "Meta description is short",
          "Description length is under 50 characters, which may not convey sufficient context in search snippets.",
          "Treat 50–160 characters as a snippet display guideline."
        )
      );
    }

    if (description.trim().length > 160) {
      issues.push(
        createIssue(
          "meta-description-too-long",
          "Metadata",
          "medium",
          "Meta description is long",
          "Description length exceeds 160 characters and may be truncated in search snippets.",
          "Treat 50–160 characters as a snippet display guideline."
        )
      );
    }
  }

  if (h1.length === 0) {
    if (!isBotChallenge) {
      issues.push(
        createIssue(
          "missing-h1",
          "Content Structure",
          "medium",
          "No H1 heading found",
          mayRequireJs
            ? "This page does not contain an H1 heading in initial HTML. Not detected because the page may require JavaScript rendering."
            : "This page does not contain an H1 heading. An H1 tag helps users and search crawlers quickly understand the primary topic.",
          "Add one clear H1 heading describing the primary topic for accessibility and document structure.",
          { detectionState: mayRequireJs ? "requires_javascript" : "definitely_missing" }
        )
      );
    }
  }

  if (h1.length > 1) {
    issues.push(
      createIssue(
        "multiple-h1",
        "Content Structure",
        "low",
        "Multiple H1 headings found",
        "Multiple H1 tags were found. Modern HTML permits multiple H1s, but using a single primary H1 remains a recommended structural best practice.",
        "Consider consolidating to one main H1 heading per page for topic clarity."
      )
    );
  }

  if (allHeadings.some(isBlank)) {
    issues.push(
      createIssue(
        "empty-headings",
        "Content Structure",
        "medium",
        "Empty heading text found",
        "One or more headings are present but have no meaningful text.",
        "Remove empty headings or add descriptive heading text."
      )
    );
  }

  const missingAltCount = images.filter(image => image?.hasAltAttribute === false || image?.alt == null).length;
  const emptyAltCount = images.filter(
    image => image?.hasAltAttribute === true && typeof image.alt === "string" && image.alt.trim() === ""
  ).length;

  if (missingAltCount > 0 && !isBotChallenge) {
    issues.push(
      createIssue(
        "images-missing-alt",
        "Images",
        "medium",
        "Images missing alt attributes",
        `${missingAltCount} image(s) do not define an alt attribute.`,
        "Add descriptive alt attributes to meaningful images for accessibility and image SEO."
      )
    );
  }

  if (emptyAltCount > 0 && !isBotChallenge) {
    issues.push(
      createIssue(
        "images-empty-alt",
        "Images",
        "info",
        "Images with empty alt text",
        `${emptyAltCount} image(s) have blank alt="" attributes. Empty alt is appropriate for decorative images.`,
        "Keep empty alt text for purely decorative images; ensure informative images have descriptive alt text."
      )
    );
  }

  const allLinks = [...internalLinks, ...externalLinks];
  const emptyAnchorTextCount = allLinks.filter(link => isBlank(link.text)).length;

  const scriptOrPlaceholderLinks = allLinks.filter(link => {
    const href = String(link.href || "").trim().toLowerCase();
    return href === "#" || href.startsWith("javascript:");
  }).length;

  const likelyBrokenCount = allLinks.filter(link => {
    const href = String(link.href || "").trim().toLowerCase();
    if (href === "#" || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return false;
    }
    try {
      new URL(href, finalUrl || "https://example.com");
      return false;
    } catch (err) {
      return true;
    }
  }).length;

  if (allLinks.length === 0 && !isBotChallenge) {
    issues.push(
      createIssue(
        "no-links",
        "Links",
        "medium",
        "No links found",
        "No internal or external links were detected on this page.",
        "Add meaningful internal linking to help crawlability and context."
      )
    );
  }

  if (emptyAnchorTextCount > 0 && !isBotChallenge) {
    issues.push(
      createIssue(
        "empty-anchor-text",
        "Links",
        "medium",
        "Links with empty anchor text",
        `${emptyAnchorTextCount} link(s) have no anchor text.`,
        "Use descriptive anchor text to improve accessibility and relevance signals."
      )
    );
  }

  if (scriptOrPlaceholderLinks > 0 && !isBotChallenge) {
    issues.push(
      createIssue(
        "interactive-placeholder-links",
        "Links",
        "low",
        "Interactive or placeholder links found",
        `${scriptOrPlaceholderLinks} link(s) use '#' or 'javascript:' href values.`,
        "Ensure primary site navigation uses standard crawlable URLs rather than JavaScript event handlers."
      )
    );
  }

  if (likelyBrokenCount > 0 && !isBotChallenge) {
    issues.push(
      createIssue(
        "possible-broken-links",
        "Links",
        "medium",
        "Links may be non-crawlable or malformed",
        `${likelyBrokenCount} link(s) have unparseable or malformed URL structures.`,
        "Replace invalid link URLs with valid, crawlable absolute or relative paths."
      )
    );
  }

  if (isBlank(canonical)) {
    if (!isBotChallenge) {
      issues.push(
        createIssue(
          "missing-canonical",
          "Technical SEO",
          "medium",
          "Canonical URL is missing",
          "No canonical link tag was found on this page.",
          "Add a self-referential canonical URL tag to clarify preferred indexing URL."
        )
      );
    }
  } else {
    try {
      new URL(canonical, finalUrl || data?.url || "https://example.com");
    } catch (error) {
      issues.push(
        createIssue(
          "invalid-canonical",
          "Technical SEO",
          "high",
          "Canonical URL is invalid",
          "The canonical tag value is not a valid URL.",
          "Set canonical to a valid absolute or site-relative URL."
        )
      );
    }
  }

  let pathname = "";
  try {
    pathname = new URL(finalUrl || data?.url || "https://example.com").pathname.toLowerCase();
  } catch (err) {
    pathname = "";
  }

  const isUtilityPage = Boolean(
    pathname.includes("/login") ||
    pathname.includes("/admin") ||
    pathname.includes("/cart") ||
    pathname.includes("/checkout") ||
    pathname.includes("/account") ||
    pathname.includes("/auth") ||
    pathname.includes("/search") ||
    pathname.includes("/signin") ||
    pathname.includes("/signup")
  );

  const isHomepage = pathname === "/" || pathname === "";

  if (robotsMeta.includes("noindex")) {
    if (isUtilityPage) {
      issues.push(
        createIssue(
          "robots-noindex-utility",
          "Technical SEO",
          "info",
          "Robots meta contains noindex on utility/private page",
          "This page contains noindex, which is standard practice for private or utility pages (such as login or checkout).",
          "No action required if this page is intended to be kept out of search results."
        )
      );
    } else {
      issues.push(
        createIssue(
          "robots-noindex",
          "Technical SEO",
          isHomepage ? "critical" : "high",
          "Robots meta contains noindex",
          "Search engines are instructed not to index this page.",
          "Remove noindex if this page should appear in search results."
        )
      );
    }
  }

  if (robotsMeta.includes("nofollow")) {
    issues.push(
      createIssue(
        "robots-nofollow",
        "Technical SEO",
        "medium",
        "Robots meta contains nofollow",
        "Search engines are instructed not to follow links on this page.",
        "Remove nofollow if link equity and crawl flow are intended."
      )
    );
  }

  const missingOpenGraphTags = [];
  if (isBlank(openGraph.title)) missingOpenGraphTags.push("og:title");
  if (isBlank(openGraph.description)) missingOpenGraphTags.push("og:description");
  if (isBlank(openGraph.image)) missingOpenGraphTags.push("og:image");
  if (isBlank(openGraph.url)) missingOpenGraphTags.push("og:url");
  if (isBlank(openGraph.type)) missingOpenGraphTags.push("og:type");

  if (missingOpenGraphTags.length > 0) {
    issues.push(
      createIssue(
        "missing-open-graph-tags",
        "Social Sharing",
        "low",
        "Open Graph metadata is incomplete",
        "Open Graph metadata is incomplete. Some Open Graph tags are missing and may affect how the page appears when shared on social platforms.",
        `Add missing Open Graph tags (${missingOpenGraphTags.join(", ")}) to improve social link previews.`
      )
    );
  }

  const missingTwitterTags = [];
  if (isBlank(twitterCard.card)) missingTwitterTags.push("twitter:card");
  if (isBlank(twitterCard.title)) missingTwitterTags.push("twitter:title");
  if (isBlank(twitterCard.description)) missingTwitterTags.push("twitter:description");
  if (isBlank(twitterCard.image)) missingTwitterTags.push("twitter:image");

  if (missingTwitterTags.length > 0) {
    issues.push(
      createIssue(
        "missing-twitter-tags",
        "Social Sharing",
        "low",
        "Twitter Card metadata is incomplete",
        "Twitter Card metadata is incomplete. Some Twitter/X Card tags are missing. Adding the recommended tags can improve how this page appears when shared on X/Twitter.",
        `Add missing Twitter Card tags (${missingTwitterTags.join(", ")}) to improve how this page appears when shared on X/Twitter.`
      )
    );
  }

  if (!structuredData.length) {
    issues.push(
      createIssue(
        "missing-structured-data",
        "Structured Data",
        "info",
        "No JSON-LD structured data detected",
        "No schema markup was found in JSON-LD scripts.",
        "Add relevant structured data where it supports the page content."
      )
    );
  }

  if (!finalUrl.startsWith("https://")) {
    issues.push(
      createIssue(
        "non-https-url",
        "Technical SEO",
        "high",
        "Page is not using HTTPS",
        "The scanned page does not resolve to HTTPS.",
        "Serve this page over HTTPS to improve trust and ranking signals."
      )
    );
  }

  if (typeof status === "number" && status >= 400) {
    issues.push(
      createIssue(
        "http-status-error",
        "Technical SEO",
        "critical",
        "HTTP status indicates an error",
        `The final response status is ${status}.`,
        "Resolve server or routing issues so the page responds with a successful status."
      )
    );
  }

  if (isBlank(viewport) && !isBotChallenge) {
    issues.push(
      createIssue(
        "missing-viewport",
        "Technical SEO",
        "medium",
        "Viewport meta tag is missing",
        "No viewport tag was detected for responsive behavior.",
        "Add a viewport meta tag for mobile rendering support."
      )
    );
  }

  const consoleErrorCount = data?.browser?.consoleErrors?.length || 0;
  const failedRequestCount = data?.browser?.failedRequests?.length || 0;

  if (consoleErrorCount > 0) {
    diagnostics.push(
      createIssue(
        "console-errors-found",
        "Technical Diagnostics",
        "info",
        "Console errors were detected",
        `${consoleErrorCount} console error(s) were captured during scan.`,
        "Review browser console errors and fix script/runtime issues that impact rendering."
      )
    );
  }

  if (failedRequestCount > 0) {
    diagnostics.push(
      createIssue(
        "failed-requests-found",
        "Technical Diagnostics",
        "info",
        "Failed network requests were detected",
        `${failedRequestCount} failed request(s) were captured during scan.`,
        "Fix failing requests for assets, APIs, or dependent resources."
      )
    );
  }

  const confidence = calculateAuditConfidence(data, issues, mayRequireJs);

  const coreIssues = issues.filter(
    issue =>
      issue.category !== "Social Sharing" &&
      issue.category !== "Structured Data" &&
      issue.category !== "Technical Diagnostics" &&
      issue.category !== "Browser"
  );

  const critical = coreIssues.filter(issue => issue.severity === "critical").length;
  const high = coreIssues.filter(issue => issue.severity === "high").length;
  const warnings = coreIssues.filter(issue => issue.severity === "medium" || issue.severity === "warning").length;
  const passed = Math.max(0, 24 - (critical + high + warnings));

  const openGraphWarning = issues.some(issue => issue.id === "missing-open-graph-tags");
  const twitterCardWarning = issues.some(issue => issue.id === "missing-twitter-tags");

  return {
    issues,
    diagnostics,
    mayRequireJs,
    confidence,
    summary: {
      passed,
      warnings: warnings + high,
      critical,
      coreSeo: {
        passed,
        warnings: warnings + high,
        critical
      },
      socialSharing: {
        openGraph: openGraphWarning ? "Warning" : "Passed",
        twitterCard: twitterCardWarning ? "Warning" : "Passed"
      },
      structuredData: {
        status: structuredData.length > 0 ? "Detected" : "Not detected (Info)",
        count: structuredData.length
      }
    }
  };
}

module.exports = {
  analyzeSeo
};
