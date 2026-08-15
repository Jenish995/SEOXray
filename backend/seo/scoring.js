const CATEGORY_WEIGHTS = {
  "Technical SEO": 35,
  Metadata: 30,
  "Content Structure": 20,
  Images: 10,
  Links: 5,
  "Social Sharing": 0,
  "Social Metadata": 0,
  "Structured Data": 0,
  "Technical Diagnostics": 0,
  Browser: 0
};

const ISSUE_IMPACT = {
  critical: 0.70,
  high: 0.40,
  medium: 0.20,
  warning: 0.20,
  low: 0.05,
  info: 0.00
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function gradeFromScore(value) {
  if (value >= 97) return "A+";
  if (value >= 93) return "A";
  if (value >= 90) return "A-";
  if (value >= 87) return "B+";
  if (value >= 83) return "B";
  if (value >= 80) return "B-";
  if (value >= 77) return "C+";
  if (value >= 73) return "C";
  if (value >= 70) return "C-";
  if (value >= 60) return "D";
  return "F";
}

function calculateSeoScore(analysis) {
  const issues = analysis?.issues || [];

  const penaltiesByCategory = {};

  for (const issue of issues) {
    const category = issue.category;
    const severity = issue.severity;
    const weight = CATEGORY_WEIGHTS[category] || 0;
    const impact = ISSUE_IMPACT[severity] || 0;

    if (!weight || !impact) {
      continue;
    }

    if (!penaltiesByCategory[category]) {
      penaltiesByCategory[category] = 0;
    }

    penaltiesByCategory[category] += weight * impact;
  }

  let totalPenalty = 0;
  for (const category of Object.keys(CATEGORY_WEIGHTS)) {
    const categoryWeight = CATEGORY_WEIGHTS[category];
    const categoryPenalty = penaltiesByCategory[category] || 0;

    totalPenalty += Math.min(categoryWeight, categoryPenalty);
  }

  const rawScore = 100 - totalPenalty;
  const value = clamp(Math.round(rawScore), 0, 100);
  const grade = gradeFromScore(value);

  return {
    score: {
      value,
      grade,
      label: "Technical SEO Audit Score",
      explanation: "This is an audit score based on technical and on-page SEO checks performed by our tool. It does not represent your Google ranking, Search Console performance, or Google's assessment of your website."
    },
    confidence: analysis?.confidence || {
      score: 100,
      rating: "High",
      signals: []
    },
    summary: {
      passed: analysis?.summary?.passed || 0,
      warnings: analysis?.summary?.warnings || 0,
      critical: analysis?.summary?.critical || 0,
      coreSeo: analysis?.summary?.coreSeo || {
        passed: analysis?.summary?.passed || 0,
        warnings: analysis?.summary?.warnings || 0,
        critical: analysis?.summary?.critical || 0
      },
      socialSharing: analysis?.summary?.socialSharing || {
        openGraph: "Passed",
        twitterCard: "Passed"
      },
      structuredData: analysis?.summary?.structuredData || {
        status: "Not detected (Info)",
        count: 0
      }
    },
    meta: {
      weights: CATEGORY_WEIGHTS,
      impact: ISSUE_IMPACT
    }
  };
}

module.exports = {
  calculateSeoScore,
  CATEGORY_WEIGHTS,
  ISSUE_IMPACT
};
