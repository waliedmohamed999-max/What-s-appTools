import { useEffect, useState, type FormEvent } from 'react';
import {
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  Mail,
  Phone,
  Share2,
  TrendingUp,
  TrendingDown,
  Download
} from 'lucide-react';
import PageShell from '../components/PageShell';
import BackLink from '../components/BackLink';
import { apiFetch, apiUrl } from '../lib/api';

type Issue = { severity: 'high' | 'medium' | 'low'; message: string };

type CategoryScores = { seo: number; technical: number; trust: number; social: number };

type AnalysisResult = {
  url: string;
  hostname: string;
  fetchedAt: string;
  responseTimeMs: number;
  score: number;
  categoryScores: CategoryScores;
  previousScore: number | null;
  scoreDelta: number | null;
  issues: Issue[];
  details: {
    title: string;
    metaDescription: string;
    isHttps: boolean;
    hasViewport: boolean;
    hasOpenGraph: boolean;
    hasFavicon: boolean;
    hasCanonical: boolean;
    hasStructuredData: boolean;
    hasNoindex: boolean;
    hasRobotsTxt: boolean;
    externalScriptCount: number;
    h1Count: number;
    imageCount: number;
    imagesWithoutAlt: number;
    altCoveragePercent: number;
    wordCount: number;
    socialLinks: string[];
    emails: string[];
    phones: string[];
    platform: string | null;
    pageSizeKb: number;
  };
};

type HistoryEntry = {
  id: string;
  hostname: string;
  url: string;
  score: number;
  categoryScores: CategoryScores;
  fetchedAt: string;
};

const CATEGORY_LABELS: { key: keyof CategoryScores; label: string }[] = [
  { key: 'seo', label: 'SEO' },
  { key: 'technical', label: 'تقني / Technical' },
  { key: 'trust', label: 'ثقة / Trust' },
  { key: 'social', label: 'سوشيال / Social' }
];

function scoreColor(score: number) {
  if (score >= 80) return { text: 'text-emerald-600', ring: '#10b981', bar: 'bg-emerald-500' };
  if (score >= 50) return { text: 'text-amber-600', ring: '#f59e0b', bar: 'bg-amber-500' };
  return { text: 'text-red-600', ring: '#ef4444', bar: 'bg-red-500' };
}

function IssueIcon({ severity }: { severity: Issue['severity'] }) {
  if (severity === 'high') return <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />;
  if (severity === 'medium') return <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />;
  return <Info size={15} className="text-gray-400 shrink-0 mt-0.5" />;
}

export default function StoreAnalyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  async function loadHistory() {
    try {
      setHistory(await apiFetch<HistoryEntry[]>('/api/store-analysis/history'));
    } catch (err) {
      /* history is a nice-to-have, ignore failures */
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await apiFetch<AnalysisResult>('/api/store-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      setResult(data);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر الاتصال بالخادم / Cannot reach the server');
    } finally {
      setLoading(false);
    }
  }

  const colors = result ? scoreColor(result.score) : null;

  return (
    <PageShell>
      <BackLink />
      <h1 className="text-[1.5rem] sm:text-[1.75rem] font-medium text-gray-900 tracking-tight mb-2">
        Store Analyzer
      </h1>
      <p className="text-[13px] text-gray-400 mb-8">
        تحليل المتاجر / ارفع رابط متجرك أو موقعك واحصل على تقييم فوري مع توصيات للتحسين.
      </p>

      <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-2 mb-8">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourstore.com"
          className="flex-1 rounded-xl px-4 py-3 border border-gray-200 text-[16px] sm:text-[13px] bg-white focus:outline-none focus:border-blue-400"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-white bg-blue-500 rounded-xl px-6 py-3 hover:bg-blue-600 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'جارٍ التحليل... Analyzing' : 'تحليل / Analyze'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl px-4 py-3 mb-8">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-5 mb-10">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-6">
            <div
              className="flex items-center justify-center rounded-full w-20 h-20 shrink-0 border-4"
              style={{ borderColor: colors?.ring }}
            >
              <span className={`text-[1.5rem] font-semibold ${colors?.text}`}>{result.score}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-900 break-all">{result.url}</p>
              <p className="text-[12px] text-gray-400 mt-1">
                زمن الاستجابة {result.responseTimeMs}ms · حجم الصفحة {result.details.pageSizeKb}KB
                {result.details.platform ? ` · منصة: ${result.details.platform}` : ''}
              </p>
              {result.scoreDelta !== null && result.scoreDelta !== 0 && (
                <p
                  className={`text-[12px] mt-1 inline-flex items-center gap-1 ${
                    result.scoreDelta > 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {result.scoreDelta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {result.scoreDelta > 0 ? '+' : ''}
                  {result.scoreDelta} نقطة منذ آخر تحليل (كان {result.previousScore})
                </p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="text-[14px] font-medium text-gray-900 mb-4">التقييم حسب الفئة / Score Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {CATEGORY_LABELS.map(({ key, label }) => {
                const value = result.categoryScores[key];
                const c = scoreColor(value);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-[11.5px] mb-1.5">
                      <span className="text-gray-500">{label}</span>
                      <span className={`font-medium ${c.text}`}>{value}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {result.details.hasNoindex && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-[12.5px] rounded-xl px-4 py-3">
              تحذير: الصفحة تحتوي على وسم noindex ولن تظهر في نتائج البحث إطلاقاً.
            </div>
          )}

          {result.issues.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-[14px] font-medium text-gray-900 mb-4">
                ملاحظات للتحسين / Recommendations
              </h3>
              <ul className="space-y-3">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-gray-600">
                    <IssueIcon severity={issue.severity} />
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="text-[14px] font-medium text-gray-900 mb-4">التفاصيل / Details</h3>
            <dl className="grid grid-cols-2 gap-y-3 text-[12.5px]">
              <dt className="text-gray-400">العنوان / Title</dt>
              <dd className="text-gray-700 truncate">{result.details.title || '—'}</dd>

              <dt className="text-gray-400">وصف Meta</dt>
              <dd className="text-gray-700 truncate">{result.details.metaDescription || '—'}</dd>

              <dt className="text-gray-400">HTTPS</dt>
              <dd className="text-gray-700">{result.details.isHttps ? 'نعم / Yes' : 'لا / No'}</dd>

              <dt className="text-gray-400">متوافق مع الجوال</dt>
              <dd className="text-gray-700">{result.details.hasViewport ? 'نعم / Yes' : 'لا / No'}</dd>

              <dt className="text-gray-400">Canonical</dt>
              <dd className="text-gray-700">{result.details.hasCanonical ? 'نعم / Yes' : 'لا / No'}</dd>

              <dt className="text-gray-400">بيانات Schema.org</dt>
              <dd className="text-gray-700">{result.details.hasStructuredData ? 'نعم / Yes' : 'لا / No'}</dd>

              <dt className="text-gray-400">robots.txt</dt>
              <dd className="text-gray-700">{result.details.hasRobotsTxt ? 'نعم / Yes' : 'لا / No'}</dd>

              <dt className="text-gray-400">سكربتات خارجية</dt>
              <dd className="text-gray-700">{result.details.externalScriptCount}</dd>

              <dt className="text-gray-400">عدد الكلمات</dt>
              <dd className="text-gray-700">{result.details.wordCount}</dd>

              <dt className="text-gray-400">الصور بدون alt</dt>
              <dd className="text-gray-700">
                {result.details.imagesWithoutAlt} من {result.details.imageCount} ({result.details.altCoveragePercent}% تغطية)
              </dd>

              <dt className="text-gray-400 flex items-center gap-1">
                <Share2 size={12} /> سوشيال ميديا
              </dt>
              <dd className="text-gray-700">
                {result.details.socialLinks.length > 0 ? result.details.socialLinks.join(', ') : '—'}
              </dd>

              <dt className="text-gray-400 flex items-center gap-1">
                <Mail size={12} /> إيميل
              </dt>
              <dd className="text-gray-700">{result.details.emails.join(', ') || '—'}</dd>

              <dt className="text-gray-400 flex items-center gap-1">
                <Phone size={12} /> هاتف
              </dt>
              <dd className="text-gray-700">{result.details.phones.join(', ') || '—'}</dd>
            </dl>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-medium text-gray-900">السجل / History</h3>
            <a
              href={apiUrl('/api/store-analysis/history.xlsx')}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-500 hover:text-blue-600 transition-colors"
            >
              <Download size={12} />
              تصدير Excel
            </a>
          </div>
          <div className="space-y-2">
            {history.map((h) => {
              const c = scoreColor(h.score);
              return (
                <div key={h.id} className="flex items-center justify-between text-[12.5px] py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700 truncate">{h.hostname}</span>
                  <span className="text-gray-400 shrink-0 mx-3">
                    {new Date(h.fetchedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`font-medium shrink-0 ${c.text}`}>{h.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
