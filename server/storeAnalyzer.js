const cheerio = require('cheerio');

const FETCH_TIMEOUT_MS = 8000;
const ROBOTS_TIMEOUT_MS = 4000;
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024; // 5MB

function isPrivateHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1') return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  return false;
}

function normalizeUrl(input) {
  let raw = String(input || '').trim();
  if (!raw) throw new Error('الرجاء إدخال رابط الموقع / Please enter a website URL');
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;

  let url;
  try {
    url = new URL(raw);
  } catch (err) {
    throw new Error('رابط غير صالح / Invalid URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('يسمح فقط بروابط http/https / Only http/https URLs are allowed');
  }
  if (isPrivateHost(url.hostname)) {
    throw new Error('لا يمكن تحليل عناوين داخلية / Internal addresses are not allowed');
  }
  return url;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StoreAnalyzerBot/1.0)' }
    });
    const responseTimeMs = Date.now() - start;

    const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
    if (contentLength && contentLength > MAX_CONTENT_LENGTH) {
      throw new Error('الصفحة كبيرة جداً للتحليل / Page is too large to analyze');
    }
    if (!res.ok) {
      throw new Error(`تعذر الوصول للموقع (HTTP ${res.status}) / Could not reach the site (HTTP ${res.status})`);
    }

    const html = await res.text();
    if (Buffer.byteLength(html, 'utf8') > MAX_CONTENT_LENGTH) {
      throw new Error('الصفحة كبيرة جداً للتحليل / Page is too large to analyze');
    }

    return { html, responseTimeMs, finalUrl: res.url || url.toString() };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('انتهت مهلة الاتصال بالموقع / Connection to the site timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkRobotsTxt(origin) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROBOTS_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/robots.txt`, { signal: controller.signal, redirect: 'follow' });
    return res.ok;
  } catch (err) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

const PLATFORM_SIGNATURES = [
  { name: 'Salla', test: (html) => /salla|cdn\.salla\.sa/i.test(html) },
  { name: 'Zid', test: (html) => /zid\.store|cdn\.zid\.sa/i.test(html) },
  { name: 'Shopify', test: (html) => /cdn\.shopify\.com|Shopify\.theme/i.test(html) },
  { name: 'WooCommerce', test: (html) => /woocommerce/i.test(html) },
  { name: 'WordPress', test: (html) => /wp-content|wp-includes/i.test(html) },
  { name: 'Wix', test: (html) => /wix\.com|wixstatic/i.test(html) }
];

const SOCIAL_DOMAINS = [
  { key: 'facebook', pattern: /facebook\.com/i },
  { key: 'instagram', pattern: /instagram\.com/i },
  { key: 'twitter', pattern: /twitter\.com|(?<!\w)x\.com/i },
  { key: 'tiktok', pattern: /tiktok\.com/i },
  { key: 'linkedin', pattern: /linkedin\.com/i },
  { key: 'whatsapp', pattern: /wa\.me|api\.whatsapp\.com/i },
  { key: 'snapchat', pattern: /snapchat\.com/i },
  { key: 'youtube', pattern: /youtube\.com/i }
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?\d[\d\s\-()]{7,15}\d)/g;

function analyzeHtml(html, url) {
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim();
  const metaDescription = ($('meta[name="description"]').attr('content') || '').trim();
  const hasViewport = $('meta[name="viewport"]').length > 0;
  const hasOgTitle = $('meta[property="og:title"]').length > 0;
  const hasOgImage = $('meta[property="og:image"]').length > 0;
  const hasFavicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
  const h1Count = $('h1').length;
  const hasCanonical = $('link[rel="canonical"]').length > 0;
  const hasStructuredData = $('script[type="application/ld+json"]').length > 0;

  const metaRobots = ($('meta[name="robots"]').attr('content') || '').toLowerCase();
  const hasNoindex = /noindex/.test(metaRobots);

  let externalScriptCount = 0;
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    try {
      const scriptUrl = new URL(src, url);
      if (scriptUrl.hostname !== url.hostname) externalScriptCount++;
    } catch (err) {
      /* ignore malformed script src */
    }
  });

  const images = $('img');
  const imageCount = images.length;
  let imagesWithoutAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr('alt');
    if (!alt || !alt.trim()) imagesWithoutAlt++;
  });
  const altCoveragePercent = imageCount > 0 ? Math.round(((imageCount - imagesWithoutAlt) / imageCount) * 100) : 100;

  const bodyText = $('body').text();
  const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;
  const emails = [...new Set((bodyText.match(EMAIL_REGEX) || []).slice(0, 5))];
  const rawPhones = bodyText.match(PHONE_REGEX) || [];
  const phones = [...new Set(rawPhones.filter((p) => p.replace(/\D/g, '').length >= 8).slice(0, 5))];

  const socialLinks = SOCIAL_DOMAINS.filter((s) => s.pattern.test(html)).map((s) => s.key);

  let platform = null;
  for (const sig of PLATFORM_SIGNATURES) {
    if (sig.test(html)) {
      platform = sig.name;
      break;
    }
  }

  const isHttps = url.protocol === 'https:';
  const pageSizeKb = Math.round(Buffer.byteLength(html, 'utf8') / 1024);

  return {
    title,
    metaDescription,
    isHttps,
    hasViewport,
    hasOpenGraph: hasOgTitle && hasOgImage,
    hasFavicon,
    hasCanonical,
    hasStructuredData,
    hasNoindex,
    externalScriptCount,
    h1Count,
    imageCount,
    imagesWithoutAlt,
    altCoveragePercent,
    wordCount,
    socialLinks,
    emails,
    phones,
    platform,
    pageSizeKb,
    hasRobotsTxt: false // filled in by analyzeUrl after a separate fetch
  };
}

// Each check contributes `weight` points (out of 100) scaled by evaluate()'s 0..1 return value,
// and is grouped into a category so the UI can show a breakdown, not just one number.
const CHECKS = [
  {
    key: 'noindex',
    category: 'seo',
    weight: 10,
    evaluate: (d) => (d.hasNoindex ? 0 : 1),
    issue: (d) =>
      d.hasNoindex
        ? { severity: 'high', message: 'الصفحة تحتوي على noindex ولن تظهر في نتائج البحث / Page has a noindex tag — it will not appear in search results' }
        : null
  },
  {
    key: 'https',
    category: 'technical',
    weight: 8,
    evaluate: (d) => (d.isHttps ? 1 : 0),
    issue: (d) => (d.isHttps ? null : { severity: 'high', message: 'الموقع لا يستخدم HTTPS / Site is not served over HTTPS' })
  },
  {
    key: 'title',
    category: 'seo',
    weight: 8,
    evaluate: (d) => (d.title && d.title.length >= 10 && d.title.length <= 70 ? 1 : 0),
    issue: (d) =>
      d.title && d.title.length >= 10 && d.title.length <= 70
        ? null
        : { severity: 'medium', message: 'عنوان الصفحة (Title) مفقود أو غير مناسب الطول / Page title missing or poor length' }
  },
  {
    key: 'metaDescription',
    category: 'seo',
    weight: 8,
    evaluate: (d) => (d.metaDescription && d.metaDescription.length >= 50 && d.metaDescription.length <= 160 ? 1 : 0),
    issue: (d) =>
      d.metaDescription && d.metaDescription.length >= 50 && d.metaDescription.length <= 160
        ? null
        : { severity: 'medium', message: 'وصف Meta مفقود أو غير مناسب الطول / Meta description missing or poor length' }
  },
  {
    key: 'viewport',
    category: 'technical',
    weight: 8,
    evaluate: (d) => (d.hasViewport ? 1 : 0),
    issue: (d) => (d.hasViewport ? null : { severity: 'high', message: 'لا يوجد إعداد للعرض على الجوال (viewport) / Missing mobile viewport tag' })
  },
  {
    key: 'contact',
    category: 'trust',
    weight: 8,
    evaluate: (d) => (d.emails.length > 0 || d.phones.length > 0 ? 1 : 0),
    issue: (d) =>
      d.emails.length > 0 || d.phones.length > 0
        ? null
        : { severity: 'medium', message: 'لا توجد معلومات تواصل ظاهرة (إيميل/هاتف) / No visible contact info (email/phone)' }
  },
  {
    key: 'h1',
    category: 'seo',
    weight: 6,
    evaluate: (d) => (d.h1Count === 1 ? 1 : d.h1Count > 1 ? 0.5 : 0),
    issue: (d) => {
      if (d.h1Count === 1) return null;
      if (d.h1Count > 1) return { severity: 'low', message: 'أكثر من عنوان H1 بالصفحة / Multiple H1 tags found' };
      return { severity: 'medium', message: 'لا يوجد عنوان رئيسي H1 / Missing H1 heading' };
    }
  },
  {
    key: 'altText',
    category: 'seo',
    weight: 6,
    evaluate: (d) => d.altCoveragePercent / 100,
    issue: (d) =>
      d.altCoveragePercent < 80
        ? { severity: 'medium', message: `${d.imagesWithoutAlt} صورة بدون نص بديل (alt) / ${d.imagesWithoutAlt} images missing alt text` }
        : null
  },
  {
    key: 'openGraph',
    category: 'social',
    weight: 6,
    evaluate: (d) => (d.hasOpenGraph ? 1 : 0),
    issue: (d) => (d.hasOpenGraph ? null : { severity: 'low', message: 'لا توجد بيانات Open Graph لمعاينة المشاركة / Missing Open Graph tags for social sharing previews' })
  },
  {
    key: 'social',
    category: 'social',
    weight: 6,
    evaluate: (d) => (d.socialLinks.length > 0 ? 1 : 0),
    issue: (d) => (d.socialLinks.length > 0 ? null : { severity: 'low', message: 'لا توجد روابط لحسابات سوشيال ميديا / No social media links found' })
  },
  {
    key: 'canonical',
    category: 'seo',
    weight: 5,
    evaluate: (d) => (d.hasCanonical ? 1 : 0),
    issue: (d) => (d.hasCanonical ? null : { severity: 'low', message: 'لا يوجد رابط Canonical / Missing canonical tag' })
  },
  {
    key: 'structuredData',
    category: 'seo',
    weight: 5,
    evaluate: (d) => (d.hasStructuredData ? 1 : 0),
    issue: (d) => (d.hasStructuredData ? null : { severity: 'low', message: 'لا توجد بيانات منظمة Schema.org / No structured data (JSON-LD) found' })
  },
  {
    key: 'favicon',
    category: 'trust',
    weight: 4,
    evaluate: (d) => (d.hasFavicon ? 1 : 0),
    issue: (d) => (d.hasFavicon ? null : { severity: 'low', message: 'لا يوجد أيقونة موقع (favicon) / Missing favicon' })
  },
  {
    key: 'pageSize',
    category: 'technical',
    weight: 4,
    evaluate: (d) => (d.pageSizeKb <= 2000 ? 1 : Math.max(0, 1 - (d.pageSizeKb - 2000) / 5000)),
    issue: (d) => (d.pageSizeKb <= 2000 ? null : { severity: 'low', message: `حجم الصفحة كبير (${d.pageSizeKb}KB) / Page size is large (${d.pageSizeKb}KB)` })
  },
  {
    key: 'robotsTxt',
    category: 'technical',
    weight: 4,
    evaluate: (d) => (d.hasRobotsTxt ? 1 : 0),
    issue: (d) => (d.hasRobotsTxt ? null : { severity: 'low', message: 'لا يوجد ملف robots.txt / Missing robots.txt' })
  },
  {
    key: 'externalScripts',
    category: 'technical',
    weight: 4,
    evaluate: (d) => (d.externalScriptCount <= 10 ? 1 : Math.max(0, 1 - (d.externalScriptCount - 10) / 20)),
    issue: (d) =>
      d.externalScriptCount <= 10
        ? null
        : { severity: 'low', message: `عدد كبير من السكربتات الخارجية (${d.externalScriptCount}) قد يبطئ الموقع / Many external scripts (${d.externalScriptCount}) may slow the site down` }
  }
];

const CATEGORIES = ['seo', 'technical', 'trust', 'social'];

function scoreAnalysis(details) {
  const issues = [];
  let score = 0;
  const categoryPoints = Object.fromEntries(CATEGORIES.map((c) => [c, { earned: 0, max: 0 }]));

  for (const check of CHECKS) {
    const value = check.evaluate(details);
    score += value * check.weight;
    categoryPoints[check.category].earned += value * check.weight;
    categoryPoints[check.category].max += check.weight;

    const issue = check.issue(details);
    if (issue) issues.push(issue);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const categoryScores = Object.fromEntries(
    CATEGORIES.map((c) => [
      c,
      categoryPoints[c].max > 0 ? Math.round((categoryPoints[c].earned / categoryPoints[c].max) * 100) : 100
    ])
  );

  const severityOrder = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return { score, categoryScores, issues };
}

async function analyzeUrl(input) {
  const url = normalizeUrl(input);
  const { html, responseTimeMs, finalUrl } = await fetchHtml(url);
  const details = analyzeHtml(html, url);
  details.hasRobotsTxt = await checkRobotsTxt(url.origin);

  const { score, categoryScores, issues } = scoreAnalysis(details);

  return {
    url: finalUrl,
    hostname: url.hostname,
    fetchedAt: new Date().toISOString(),
    responseTimeMs,
    score,
    categoryScores,
    issues,
    details
  };
}

module.exports = { analyzeUrl };
