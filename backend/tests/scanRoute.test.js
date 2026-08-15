const express = require("express");
const request = require("supertest");
const { createScanController } = require("../controller/scanController");

function buildApp(overrides = {}) {
  const app = express();
  app.use(express.json());

  const controller = createScanController({
    validateSeoUrl: overrides.validateSeoUrl || (async () => ({ ok: true, safe: true, url: "https://example.com" })),
    extractPageData: overrides.extractPageData || (async () => ({
      url: "https://example.com",
      finalUrl: "https://example.com",
      status: 200,
      metadata: {
        title: "Example title for SEO",
        description: "Meta description with enough length for tests.",
        robots: "index,follow",
        viewport: "width=device-width, initial-scale=1",
        language: "en"
      },
      headings: { h1: ["Heading"], h2: [], h3: [], h4: [], h5: [], h6: [] },
      images: [],
      links: { internal: [], external: [] },
      canonical: "https://example.com",
      technical: { canonicalUrl: "https://example.com", htmlLang: "en", robotsMeta: "index,follow" },
      openGraph: { title: "", description: "", image: "", url: "", type: "" },
      twitterCard: { card: "", title: "", description: "", image: "" },
      structuredData: [],
      browser: { consoleErrors: [], failedRequests: [] },
      performance: {},
      scanError: null
    }))
  });

  app.post("/api/scan", controller);
  return app;
}

describe("POST /api/scan", () => {
  it("returns 200 for valid scan request", async () => {
    const app = buildApp();
    const response = await request(app).post("/api/scan").send({ url: "https://example.com" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.score).toBeDefined();
    expect(response.body.coreSeo).toBeDefined();
    expect(response.body.socialSharing).toBeDefined();
    expect(response.body.structuredData).toBeDefined();
    expect(response.body.jsRendering).toBeDefined();
  });

  it("returns 400 for invalid request body", async () => {
    const app = buildApp();
    const response = await request(app).post("/api/scan").send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("returns 400 for validation failure", async () => {
    const app = buildApp({
      validateSeoUrl: async () => ({ ok: false, safe: false, error: "Please enter a valid http:// or https:// URL." })
    });

    const response = await request(app).post("/api/scan").send({ url: "bad" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("returns 403 for SSRF rejection", async () => {
    const app = buildApp({
      validateSeoUrl: async () => ({ ok: false, safe: false, error: "This hostname is private, local, or not safe to visit from a public SEO crawler." })
    });

    const response = await request(app).post("/api/scan").send({ url: "http://127.0.0.1" });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
