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

  it("flags missing H1 as warning, not critical", () => {
    const page = createBaseExtraction();
    page.headings.h1 = [];

    const analysis = analyzeSeo(page);
    const h1Issue = analysis.issues.find(issue => issue.id === "missing-h1");
    expect(h1Issue).toBeDefined();
    expect(h1Issue.severity).toBe("warning");
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

  it("flags missing canonical", () => {
    const page = createBaseExtraction();
    page.canonical = "";

    const analysis = analyzeSeo(page);
    expect(analysis.issues.some(issue => issue.id === "missing-canonical")).toBe(true);
  });

  it("flags missing open graph under Social Sharing category with updated message", () => {
    const page = createBaseExtraction();
    page.openGraph = { title: "", description: "", image: "" };

    const analysis = analyzeSeo(page);
    const ogIssue = analysis.issues.find(issue => issue.id === "missing-open-graph-tags");
    expect(ogIssue).toBeDefined();
    expect(ogIssue.category).toBe("Social Sharing");
    expect(ogIssue.message).toContain("Open Graph metadata is incomplete");
  });

  it("flags missing twitter card under Social Sharing category with updated message", () => {
    const page = createBaseExtraction();
    page.twitterCard = { card: "", title: "", description: "", image: "" };

    const analysis = analyzeSeo(page);
    const twIssue = analysis.issues.find(issue => issue.id === "missing-twitter-tags");
    expect(twIssue).toBeDefined();
    expect(twIssue.category).toBe("Social Sharing");
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
