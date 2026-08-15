const { analyzeSeo } = require("../seo/analyzer");

function createBaseExtraction() {
  return {
    url: "https://example.com",
    finalUrl: "https://example.com",
    status: 200,
    metadata: {
      title: "Example title for SEO",
      description: "This is an example meta description with enough useful detail for snippet previews.",
      robots: "index,follow",
      viewport: "width=device-width, initial-scale=1",
      language: "en"
    },
    headings: {
      h1: ["Main Heading"],
      h2: ["Section"],
      h3: [],
      h4: [],
      h5: [],
      h6: []
    },
    images: [{ src: "/hero.jpg", alt: "Hero image", hasAltAttribute: true }],
    links: {
      internal: [{ href: "/about", text: "About", rel: "", target: "" }],
      external: [{ href: "https://news.example.com", text: "News", rel: "", target: "" }]
    },
    canonical: "https://example.com",
    openGraph: {
      title: "OG Title",
      description: "OG Description",
      image: "https://example.com/og.jpg",
      url: "https://example.com",
      type: "website"
    },
    twitterCard: {
      card: "summary_large_image",
      title: "Twitter Title",
      description: "Twitter Description",
      image: "https://example.com/twitter.jpg"
    },
    structuredData: [{ raw: "{}", parsed: {} }],
    browser: {
      consoleErrors: [],
      failedRequests: []
    }
  };
}

describe("SEO analyzer rules", () => {
  it("flags missing title", () => {
    const page = createBaseExtraction();
    page.metadata.title = "";

    const analysis = analyzeSeo(page);
    expect(analysis.issues.some(issue => issue.id === "missing-title")).toBe(true);
  });

  it("does not flag missing title when title is present", () => {
    const analysis = analyzeSeo(createBaseExtraction());
    expect(analysis.issues.some(issue => issue.id === "missing-title")).toBe(false);
  });

  it("flags missing description", () => {
    const page = createBaseExtraction();
    page.metadata.description = "";

    const analysis = analyzeSeo(page);
    expect(analysis.issues.some(issue => issue.id === "missing-meta-description")).toBe(true);
  });

  it("flags missing H1 as medium priority", () => {
    const page = createBaseExtraction();
    page.headings.h1 = [];

    const analysis = analyzeSeo(page);
    const h1Issue = analysis.issues.find(issue => issue.id === "missing-h1");
    expect(h1Issue).toBeDefined();
    expect(h1Issue.severity).toBe("medium");
  });

  it("flags multiple H1", () => {
    const page = createBaseExtraction();
    page.headings.h1 = ["One", "Two"];

    const analysis = analyzeSeo(page);
    expect(analysis.issues.some(issue => issue.id === "multiple-h1")).toBe(true);
  });

  it("flags missing image alt", () => {
    const page = createBaseExtraction();
    page.images = [{ src: "/hero.jpg", alt: null, hasAltAttribute: false }];

    const analysis = analyzeSeo(page);
    expect(analysis.issues.some(issue => issue.id === "images-missing-alt")).toBe(true);
  });

  it("distinguishes empty alt from missing alt", () => {
    const page = createBaseExtraction();
    page.images = [{ src: "/hero.jpg", alt: "", hasAltAttribute: true }];

    const analysis = analyzeSeo(page);
    expect(analysis.issues.some(issue => issue.id === "images-empty-alt")).toBe(true);
    expect(analysis.issues.some(issue => issue.id === "images-missing-alt")).toBe(false);
  });

  it("flags missing canonical as medium priority", () => {
    const page = createBaseExtraction();
    page.canonical = "";

    const analysis = analyzeSeo(page);
    const canonicalIssue = analysis.issues.find(issue => issue.id === "missing-canonical");
    expect(canonicalIssue).toBeDefined();
    expect(canonicalIssue.severity).toBe("medium");
  });

  it("flags missing open graph under Social Sharing category with low severity", () => {
    const page = createBaseExtraction();
    page.openGraph = { title: "", description: "", image: "" };

    const analysis = analyzeSeo(page);
    const ogIssue = analysis.issues.find(issue => issue.id === "missing-open-graph-tags");
    expect(ogIssue).toBeDefined();
    expect(ogIssue.category).toBe("Social Sharing");
    expect(ogIssue.severity).toBe("low");
    expect(ogIssue.message).toContain("Open Graph metadata is incomplete");
  });

  it("flags missing twitter card under Social Sharing category with low severity", () => {
    const page = createBaseExtraction();
    page.twitterCard = { card: "", title: "", description: "", image: "" };

    const analysis = analyzeSeo(page);
    const twIssue = analysis.issues.find(issue => issue.id === "missing-twitter-tags");
    expect(twIssue).toBeDefined();
    expect(twIssue.category).toBe("Social Sharing");
    expect(twIssue.severity).toBe("low");
    expect(twIssue.message).toContain("Twitter Card metadata is incomplete");
  });

  it("detects JavaScript-heavy apps such as Instagram or SPA roots", () => {
    const page = createBaseExtraction();
    page.url = "https://instagram.com/p/123";
    page.finalUrl = "https://instagram.com/p/123";
    page.headings.h1 = [];
    page.metadata.title = "";

    const analysis = analyzeSeo(page);
    expect(analysis.mayRequireJs).toBe(true);
    expect(analysis.diagnostics.some(d => d.id === "js-rendering-required")).toBe(true);
  });

  it("calculates deterministic audit confidence with FULL_AUDIT / UNRELIABLE_AUDIT tiers", () => {
    const page = createBaseExtraction();
    const clean = analyzeSeo(page);
    expect(clean.confidence.score).toBe(100);
    expect(clean.confidence.rating).toBe("High");
    expect(clean.confidence.status).toBe("FULL_AUDIT");

    const challengedPage = createBaseExtraction();
    challengedPage.technical = { botVerificationDetected: true, bodyTextLength: 10 };
    challengedPage.status = 403;

    const blocked = analyzeSeo(challengedPage);
    expect(blocked.confidence.score).toBeLessThan(65);
    expect(blocked.confidence.rating).toBe("Low");
    expect(blocked.confidence.status).toBe("UNRELIABLE_AUDIT");
    expect(blocked.confidence.signals.length).toBeGreaterThan(0);
  });

  it("JS framework alone does NOT reduce confidence without missing content", () => {
    const page = createBaseExtraction();
    page.technical = { hasJsAppContainer: true, bodyTextLength: 500, botVerificationDetected: false };
    const analysis = analyzeSeo(page);
    expect(analysis.confidence.status).toBe("FULL_AUDIT");
  });

  it("normal HTTPS redirect does NOT reduce confidence", () => {
    const page = createBaseExtraction();
    page.url = "http://example.com";
    page.finalUrl = "https://example.com";
    page.technical = {
      ...page.technical,
      redirectCount: 1,
      isNormalRedirect: true
    };
    const analysis = analyzeSeo(page);
    expect(analysis.confidence.score).toBe(100);
  });

  it("classifies noindex on /login as informational, not an SEO failure", () => {
    const page = createBaseExtraction();
    page.finalUrl = "https://example.com/login";
    page.url = "https://example.com/login";
    page.metadata.robots = "noindex, nofollow";

    const analysis = analyzeSeo(page);
    const noindexIssue = analysis.issues.find(i => i.id === "robots-noindex-utility");
    expect(noindexIssue).toBeDefined();
    expect(noindexIssue.severity).toBe("info");
    expect(analysis.issues.some(i => i.id === "robots-noindex")).toBe(false);
  });

  it("classifies noindex on homepage as high severity", () => {
    const page = createBaseExtraction();
    page.finalUrl = "https://example.com/";
    page.url = "https://example.com/";
    page.metadata.robots = "noindex";

    const analysis = analyzeSeo(page);
    const noindexIssue = analysis.issues.find(i => i.id === "robots-noindex");
    expect(noindexIssue).toBeDefined();
    expect(noindexIssue.severity).toBe("critical");
  });

  it("does NOT classify mailto: or tel: links as broken SEO links", () => {
    const page = createBaseExtraction();
    page.links.external = [
      { href: "mailto:hello@example.com", text: "Email", rel: "", target: "" },
      { href: "tel:+1234567890", text: "Call Us", rel: "", target: "" }
    ];

    const analysis = analyzeSeo(page);
    expect(analysis.issues.some(i => i.id === "possible-broken-links")).toBe(false);
  });

  it("classifies # and javascript: links as low-priority interactive placeholders", () => {
    const page = createBaseExtraction();
    page.links.internal = [
      { href: "#", text: "Scroll", rel: "", target: "" },
      { href: "javascript:void(0)", text: "Click", rel: "", target: "" }
    ];

    const analysis = analyzeSeo(page);
    const placeholderIssue = analysis.issues.find(i => i.id === "interactive-placeholder-links");
    expect(placeholderIssue).toBeDefined();
    expect(placeholderIssue.severity).toBe("low");
    expect(analysis.issues.some(i => i.id === "possible-broken-links")).toBe(false);
  });

  it("classifies missing viewport as medium, not high", () => {
    const page = createBaseExtraction();
    page.metadata.viewport = "";

    const analysis = analyzeSeo(page);
    const vpIssue = analysis.issues.find(i => i.id === "missing-viewport");
    expect(vpIssue).toBeDefined();
    expect(vpIssue.severity).toBe("medium");
  });

  it("suppresses unreliable missing-title and missing-h1 findings when bot challenge detected", () => {
    const page = createBaseExtraction();
    page.metadata.title = "";
    page.headings.h1 = [];
    page.technical = { botVerificationDetected: true, bodyTextLength: 5 };

    const analysis = analyzeSeo(page);
    expect(analysis.issues.some(i => i.id === "missing-title")).toBe(false);
    expect(analysis.issues.some(i => i.id === "missing-h1")).toBe(false);
    expect(analysis.issues.some(i => i.id === "bot-verification-detected")).toBe(true);
  });

  it("treats browser errors as diagnostics, not seo failures", () => {
    const page = createBaseExtraction();
    page.browser.consoleErrors = [{ text: "boom" }];
    page.browser.failedRequests = [{ url: "https://cdn.example.com/app.js" }];

    const analysis = analyzeSeo(page);
    expect(analysis.diagnostics.length).toBe(2);
    expect(analysis.issues.some(issue => issue.id === "console-errors-found")).toBe(false);
    expect(analysis.summary.warnings).toBe(0);
  });
});
