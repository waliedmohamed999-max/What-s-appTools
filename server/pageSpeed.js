const config = require('./config');

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PSI_TIMEOUT_MS = 28000;

// Google's official Core Web Vitals / Lighthouse lab-metric thresholds (ms unless noted).
// https://web.dev/articles/defining-core-web-vitals-thresholds
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  tbt: { good: 200, poor: 600 },
  fcp: { good: 1800, poor: 3000 },
  speedIndex: { good: 3400, poor: 5800 },
  ttfb: { good: 800, poor: 1800 }
};

function rate(metricKey, value) {
  const t = THRESHOLDS[metricKey];
  if (value == null || !t) return null;
  if (value <= t.good) return 'good';
  if (value > t.poor) return 'poor';
  return 'needs-improvement';
}

function pct(score) {
  return score == null ? null : Math.round(score * 100);
}

function extractMetric(audits, auditKey, metricKey) {
  const audit = audits?.[auditKey];
  if (!audit) return null;
  return {
    value: audit.numericValue ?? null,
    displayValue: audit.displayValue || '',
    rating: rate(metricKey, audit.numericValue)
  };
}

// Real Chrome-user (CrUX) field data, when Google has enough traffic for this origin
// to report it — this is the same "field data" banner shown at the top of a
// pagespeed.web.dev report, distinct from the synthetic lab run below it.
function extractFieldData(loadingExperience) {
  const metrics = loadingExperience?.metrics;
  if (!metrics) return null;

  const map = {
    LARGEST_CONTENTFUL_PAINT_MS: 'lcp',
    CUMULATIVE_LAYOUT_SHIFT_SCORE: 'cls',
    INTERACTION_TO_NEXT_PAINT: 'inp',
    FIRST_CONTENTFUL_PAINT_MS: 'fcp'
  };

  const field = {};
  for (const [crux, key] of Object.entries(map)) {
    const entry = metrics[crux];
    if (!entry) continue;
    const value = key === 'cls' ? entry.percentile / 100 : entry.percentile;
    field[key] = { value, category: (entry.category || '').toLowerCase().replace('_', '-') };
  }
  return Object.keys(field).length ? field : null;
}

async function fetchPageSpeed(url) {
  if (!config.GOOGLE_PAGESPEED_API_KEY) return null;

  const params = new URLSearchParams({ url, key: config.GOOGLE_PAGESPEED_API_KEY, strategy: 'mobile' });
  for (const category of ['performance', 'seo', 'accessibility', 'best-practices']) {
    params.append('category', category);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  try {
    const res = await fetch(`${PSI_ENDPOINT}?${params}`, { signal: controller.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const message = body?.error?.message || `HTTP ${res.status}`;
      throw new Error(`Google PageSpeed API error: ${message}`);
    }

    const categories = body?.lighthouseResult?.categories || {};
    const audits = body?.lighthouseResult?.audits || {};

    return {
      strategy: 'mobile',
      scores: {
        performance: pct(categories.performance?.score),
        seo: pct(categories.seo?.score),
        accessibility: pct(categories.accessibility?.score),
        bestPractices: pct(categories['best-practices']?.score)
      },
      metrics: {
        lcp: extractMetric(audits, 'largest-contentful-paint', 'lcp'),
        cls: extractMetric(audits, 'cumulative-layout-shift', 'cls'),
        tbt: extractMetric(audits, 'total-blocking-time', 'tbt'),
        fcp: extractMetric(audits, 'first-contentful-paint', 'fcp'),
        speedIndex: extractMetric(audits, 'speed-index', 'speedIndex'),
        ttfb: extractMetric(audits, 'server-response-time', 'ttfb')
      },
      fieldData: extractFieldData(body?.loadingExperience),
      fetchedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { fetchPageSpeed };
