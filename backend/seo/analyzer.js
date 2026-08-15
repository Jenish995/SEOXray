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

function isLikelyBrokenLink(href) {
  const url = String(href || "").toLowerCase();
  return url.startsWith("javascript:") || url.startsWith("mailto:") || url === "#";
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
    issues.push(
      createIssue(
        "missing-title",
        "Metadata",
        "critical",
        "Title tag is missing",
        mayRequireJs
          ? "The page title is empty or not present in initial HTML. Not detected because the page may require JavaScript rendering."
          : "The page title is empty or not present.",
        "Add a unique title tag that describes the page intent.",
        { detectionState: mayRequireJs ? "requires_javascript" : "definitely_missing" }
      )
    );
  } else {
    if (title.trim().length > 60) {
      issues.push(
        createIssue(
          "title-too-long",
          "Metadata",
          "warning",
          "Title is very long",
          "Very long titles may be truncated in search snippets.",
          "Keep title length near 60 characters to improve snippet readability."
        )
      );
    }
  }

  if (isBlank(description)) {
    issues.push(
      createIssue(
        "missing-meta-description",
        "Metadata",
        "warning",
        "Meta description is missing",
        mayRequireJs
          ? "No meta description was found in initial HTML. Not detected because the page may require JavaScript rendering."
          : "No meta description was found on this page.",
        "Add a concise meta description around 50 to 160 characters.",
        { detectionState: mayRequireJs ? "requires_javascript" : "definitely_missing" }
      )
    );
  } else {
    if (description.trim().length < 50) {
      issues.push(
        createIssue(
          "meta-description-too-short",
          "Metadata",
          "warning",
          "Meta description is very short",
          "Short descriptions may not communicate enough context in snippets.",
          "Expand the meta description to provide clearer page intent."
        )
      );
    }

    if (description.trim().length > 160) {
      issues.push(
        createIssue(
          "meta-description-too-long",
          "Metadata",
          "warning",
          "Meta description is very long",
          "Long descriptions are often truncated in search snippets.",
          "Shorten the description to around 160 characters."
        )
      );
    }
  }

  if (h1.length === 0) {
    issues.push(
      createIssue(
        "missing-h1",
        "Content Structure",
        "warning",
        "No H1 heading found",
        mayRequireJs
          ? "This page does not contain an H1 heading in initial HTML. Not detected because the page may require JavaScript rendering."
          : "This page does not contain an H1 heading.",
        "Add one clear H1 heading describing the primary topic.",
        { detectionState: mayRequireJs ? "requires_javascript" : "definitely_missing" }
      )
    );
  }

  if (h1.length > 1) {
    issues.push(
      createIssue(
        "multiple-h1",
        "Content Structure",
        "warning",
        "Multiple H1 headings found",
        "Multiple H1 tags can dilute the main topic signal.",
        "Keep one primary H1 and move other headings to lower levels."
      )
    );
  }

  if (allHeadings.some(isBlank)) {
    issues.push(
      createIssue(
        "empty-headings",
        "Content Structure",
        "warning",
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

  if (missingAltCount > 0) {
    issues.push(
      createIssue(
        "images-missing-alt",
        "Images",
        "warning",
        "Images missing alt attributes",
        `${missingAltCount} image(s) do not define an alt attribute.`,
        "Add alt attributes to meaningful images for accessibility and image SEO."
      )
    );
  }

  if (emptyAltCount > 0) {
    issues.push(
      createIssue(
        "images-empty-alt",
        "Images",
        "warning",
        "Images with empty alt text",
        `${emptyAltCount} image(s) have blank alt text.`,
        "Use descriptive alt text for informative images; keep empty alt only for decorative ones."
      )
    );
  }

  const allLinks = [...internalLinks, ...externalLinks];
  const emptyAnchorTextCount = allLinks.filter(link => isBlank(link.text)).length;
  const likelyBrokenCount = allLinks.filter(link => isLikelyBrokenLink(link.href)).length;

  if (allLinks.length === 0) {
    issues.push(
      createIssue(
        "no-links",
        "Links",
        "warning",
        "No links found",
        "No internal or external links were detected on this page.",
        "Add meaningful internal linking to help crawlability and context."
      )
    );
  }

  if (emptyAnchorTextCount > 0) {
    issues.push(
      createIssue(
        "empty-anchor-text",
        "Links",
        "warning",
        "Links with empty anchor text",
        `${emptyAnchorTextCount} link(s) have no anchor text.`,
        "Use descriptive anchor text to improve accessibility and relevance signals."
      )
    );
  }

  if (likelyBrokenCount > 0) {
    issues.push(
      createIssue(
        "possible-broken-links",
        "Links",
        "warning",
        "Links may be non-crawlable",
        `${likelyBrokenCount} link(s) use placeholder or non-crawlable href values.`,
        "Replace placeholder links with valid, crawlable URLs where appropriate."
      )
    );
  }

  if (isBlank(canonical)) {
    issues.push(
      createIssue(
        "missing-canonical",
        "Technical SEO",
        "warning",
        "Canonical URL is missing",
        "No canonical link tag was found.",
        "Add a canonical URL to prevent duplicate content ambiguity."
      )
    );
  } else {
    try {
      new URL(canonical, finalUrl || data?.url || "https://example.com");
    } catch (error) {
      issues.push(
        createIssue(
          "invalid-canonical",
          "Technical SEO",
          "critical",
          "Canonical URL is invalid",
          "The canonical tag value is not a valid URL.",
          "Set canonical to a valid absolute or site-relative URL."
        )
      );
    }
  }

  if (robotsMeta.includes("noindex")) {
    issues.push(
      createIssue(
        "robots-noindex",
        "Technical SEO",
        "critical",
        "Robots meta contains noindex",
        "Search engines are instructed not to index this page.",
        "Remove noindex if this page should appear in search results."
      )
    );
  }

  if (robotsMeta.includes("nofollow")) {
    issues.push(
      createIssue(
        "robots-nofollow",
        "Technical SEO",
        "warning",
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
        "warning",
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
        "warning",
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
        "warning",
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

  if (isBlank(viewport)) {
    issues.push(
      createIssue(
        "missing-viewport",
        "Technical SEO",
        "warning",
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

  const coreIssues = issues.filter(
    issue =>
      issue.category !== "Social Sharing" &&
      issue.category !== "Structured Data" &&
      issue.category !== "Technical Diagnostics" &&
      issue.category !== "Browser"
  );

  const critical = coreIssues.filter(issue => issue.severity === "critical").length;
  const warnings = coreIssues.filter(issue => issue.severity === "warning").length;
  const passed = Math.max(0, 24 - (critical + warnings));

  const openGraphWarning = issues.some(issue => issue.id === "missing-open-graph-tags");
  const twitterCardWarning = issues.some(issue => issue.id === "missing-twitter-tags");

  return {
    issues,
    diagnostics,
    mayRequireJs,
    summary: {
      passed,
      warnings,
      critical,
      coreSeo: {
        passed,
        warnings,
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
