const config = require('./config');

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
// Mobile strategy runs Lighthouse on a simulated throttled connection, so it routinely
// takes 20-45s+ (slower than desktop) — generous on purpose to avoid aborting an
// otherwise-successful run.
const PSI_TIMEOUT_MS = 55000;

// Google's official Core Web Vitals / Lighthouse lab-metric thresholds (ms unless noted).
// https://web.dev/articles/defining-core-web-vitals-thresholds
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  tbt: { good: 200, poor: 600 },
  fcp: { good: 1800, poor: 3000 },
  speedIndex: { good: 3400, poor: 5800 },
  ttfb: { good: 800, poor: 1800 },
  inp: { good: 200, poor: 500 }
};

// The three metrics Google itself uses for the pass/fail "Core Web Vitals Assessment"
// banner on a real PSI report — field data only, never the lab run.
const CORE_WEB_VITALS = ['lcp', 'cls', 'inp'];

// Real PSI report opportunity audits, in Google's own display order, each with a
// short bilingual label — chosen instead of using Lighthouse's raw English audit
// titles directly, so the report matches the rest of DMS's Arabic/English style.
const OPPORTUNITY_LABELS = {
  'render-blocking-resources': { ar: 'موارد تمنع العرض الأول', en: 'Eliminate render-blocking resources' },
  'unused-css-rules': { ar: 'CSS غير مستخدم', en: 'Reduce unused CSS' },
  'unused-javascript': { ar: 'JavaScript غير مستخدم', en: 'Reduce unused JavaScript' },
  'modern-image-formats': { ar: 'صيغ صور أحدث (WebP/AVIF)', en: 'Serve images in next-gen formats' },
  'offscreen-images': { ar: 'صور خارج الشاشة', en: 'Defer offscreen images' },
  'unminified-css': { ar: 'ضغط CSS', en: 'Minify CSS' },
  'unminified-javascript': { ar: 'ضغط JavaScript', en: 'Minify JavaScript' },
  'efficiently-encode-images': { ar: 'ترميز الصور بكفاءة', en: 'Efficiently encode images' },
  'uses-text-compression': { ar: 'ضغط النصوص (gzip/brotli)', en: 'Enable text compression' },
  'uses-responsive-images': { ar: 'صور متجاوبة مع حجم الشاشة', en: 'Properly size images' },
  'uses-optimized-images': { ar: 'صور محسّنة', en: 'Efficiently encode images' },
  'font-display': { ar: 'تحميل الخطوط بدون حجب العرض', en: 'Ensure text remains visible during webfont load' },
  'duplicated-javascript': { ar: 'JavaScript مكرر في الحزمة', en: 'Remove duplicate modules in JavaScript bundles' },
  'legacy-javascript': { ar: 'كود JavaScript قديم غير ضروري', en: 'Avoid serving legacy JavaScript to modern browsers' },
  'uses-rel-preconnect': { ar: 'preconnect للنطاقات المطلوبة', en: 'Preconnect to required origins' },
  'uses-rel-preload': { ar: 'preload للموارد الأساسية', en: 'Preload key requests' }
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

// Google only ever assesses Core Web Vitals from field data (never the lab run) — a
// URL "passes" only if every field metric it has enough traffic to report is FAST.
function assessCoreWebVitals(fieldData) {
  if (!fieldData) return null;
  const reported = CORE_WEB_VITALS.filter((key) => fieldData[key]);
  if (reported.length === 0) return null;
  return reported.every((key) => fieldData[key].category === 'fast') ? 'pass' : 'fail';
}

// The "Opportunities" list from a real PSI report: audits with a measurable potential
// time saving, sorted by impact — the single most actionable part of the report and
// the piece the previous heuristic-only analyzer had no equivalent for at all.
function extractOpportunities(audits) {
  const opportunities = [];
  for (const [id, audit] of Object.entries(audits || {})) {
    if (audit?.details?.type !== 'opportunity') continue;
    const savingsMs = audit.details.overallSavingsMs;
    if (!savingsMs || savingsMs < 100) continue;
    const label = OPPORTUNITY_LABELS[id];
    opportunities.push({
      id,
      title: label ? `${label.ar} / ${label.en}` : audit.title,
      savingsMs: Math.round(savingsMs),
      displayValue: audit.displayValue || ''
    });
  }
  return opportunities.sort((a, b) => b.savingsMs - a.savingsMs).slice(0, 6);
}

async function fetchPageSpeed(url, strategy = 'mobile') {
  if (!config.GOOGLE_PAGESPEED_API_KEY) return null;

  const params = new URLSearchParams({ url, key: config.GOOGLE_PAGESPEED_API_KEY, strategy });
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
    const fieldData = extractFieldData(body?.loadingExperience);

    return {
      strategy,
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
      opportunities: extractOpportunities(audits),
      fieldData,
      coreWebVitalsAssessment: assessCoreWebVitals(fieldData),
      fetchedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { fetchPageSpeed };
