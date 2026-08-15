const { calculateSeoScore } = require("../seo/scoring");

describe("SEO scoring", () => {
  it("always returns a score between 0 and 100", () => {
    const result = calculateSeoScore({
      issues: [
        { category: "Technical SEO", severity: "critical" },
        { category: "Metadata", severity: "warning" },
        { category: "Images", severity: "warning" }
      ],
      summary: { passed: 10, warnings: 2, critical: 1 }
    });

    expect(result.score.value).toBeGreaterThanOrEqual(0);
    expect(result.score.value).toBeLessThanOrEqual(100);
  });

  it("is deterministic for same input", () => {
    const input = {
      issues: [
        { category: "Technical SEO", severity: "critical" },
        { category: "Metadata", severity: "warning" }
      ],
      summary: { passed: 8, warnings: 1, critical: 1 }
    };

    const a = calculateSeoScore(input);
    const b = calculateSeoScore(input);

    expect(a.score.value).toBe(b.score.value);
    expect(a.score.grade).toBe(b.score.grade);
  });

  it("critical issues reduce score more than warnings", () => {
    const warningOnly = calculateSeoScore({
      issues: [{ category: "Technical SEO", severity: "warning" }],
      summary: { passed: 9, warnings: 1, critical: 0 }
    });

    const critical = calculateSeoScore({
      issues: [{ category: "Technical SEO", severity: "critical" }],
      summary: { passed: 9, warnings: 0, critical: 1 }
    });

    expect(critical.score.value).toBeLessThan(warningOnly.score.value);
  });

  it("does not penalize informational optional checks", () => {
    const result = calculateSeoScore({
      issues: [
        { category: "Structured Data", severity: "info" },
        { category: "Technical Diagnostics", severity: "info" }
      ],
      summary: { passed: 10, warnings: 0, critical: 0 }
    });

    expect(result.score.value).toBe(100);
  });

  it("does not penalize social sharing metadata issues on core SEO score", () => {
    const result = calculateSeoScore({
      issues: [
        { category: "Social Sharing", severity: "warning" },
        { category: "Social Metadata", severity: "warning" }
      ],
      summary: { passed: 21, warnings: 2, critical: 0 }
    });

    expect(result.score.value).toBe(100);
  });

  it("includes official score explanation and confidence metrics", () => {
    const result = calculateSeoScore({
      issues: [],
      confidence: { score: 96, rating: "High", signals: [] }
    });

    expect(result.score.label).toBe("Technical SEO Audit Score");
    expect(result.score.explanation).toContain("It does not represent your Google ranking");
    expect(result.confidence.score).toBe(96);
    expect(result.confidence.rating).toBe("High");
  });

  it("returns fine-grained letter grade (e.g., A- for 94)", () => {
    const perfect = calculateSeoScore({ issues: [] });
    expect(perfect.score.value).toBe(100);
    expect(perfect.score.grade).toBe("A+");

    const singleMedium = calculateSeoScore({
      issues: [{ category: "Metadata", severity: "medium" }]
    });
    // penalty = 30 * 0.20 = 6 => raw score = 94 => Grade = A
    expect(singleMedium.score.value).toBe(94);
    expect(singleMedium.score.grade).toBe("A");
  });
});
