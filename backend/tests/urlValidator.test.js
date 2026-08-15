const { validateSeoUrlSync } = require("../validator/urlvalidator");

describe("URL validation", () => {
  it("accepts valid HTTP URL", () => {
    const result = validateSeoUrlSync("http://example.com");
    expect(result.ok).toBe(true);
  });

  it("accepts valid HTTPS URL", () => {
    const result = validateSeoUrlSync("https://example.com");
    expect(result.ok).toBe(true);
  });

  it("rejects malformed URL", () => {
    const result = validateSeoUrlSync("not-a-url");
    expect(result.ok).toBe(false);
  });

  it("rejects unsupported protocol", () => {
    const result = validateSeoUrlSync("ftp://example.com");
    expect(result.ok).toBe(false);
  });

  it("rejects empty URL", () => {
    const result = validateSeoUrlSync("");
    expect(result.ok).toBe(false);
  });
});
