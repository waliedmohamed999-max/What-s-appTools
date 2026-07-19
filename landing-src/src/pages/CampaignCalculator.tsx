import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Download, Trash2, FolderOpen, Loader2 } from 'lucide-react';
import PageShell from '../components/PageShell';
import BackLink from '../components/BackLink';
import { apiFetch, apiUrl } from '../lib/api';

type Channel = { name: string; pct: number; cpc: number; conversionRate: number };

type ChannelRow = Channel & {
  channelBudget: number;
  estimatedClicks: number;
  estimatedLeads: number;
  costPerLead: number;
  estimatedRevenue: number;
  roas: number;
};

type SavedPlan = {
  id: string;
  name: string;
  inputs: { totalBudget: number; durationDays: number; aov: number; channels: Channel[] };
  computed: { rows: ChannelRow[]; totals: Record<string, number> };
  createdAt: string;
};

const DEFAULT_CHANNELS: Channel[] = [
  { name: 'Instagram Ads', pct: 35, cpc: 1.2, conversionRate: 2.5 },
  { name: 'Google Ads', pct: 30, cpc: 2.0, conversionRate: 3.5 },
  { name: 'Snapchat Ads', pct: 20, cpc: 0.9, conversionRate: 1.8 },
  { name: 'TikTok Ads', pct: 15, cpc: 0.8, conversionRate: 1.5 }
];

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function clampNumber(value: string | number, min: number, max: number, integer = false) {
  const parsed = Number(value);
  const finite = Number.isFinite(parsed) ? parsed : min;
  const clamped = Math.min(max, Math.max(min, finite));
  return integer ? Math.round(clamped) : clamped;
}

export default function CampaignCalculator() {
  const [totalBudget, setTotalBudget] = useState(10000);
  const [durationDays, setDurationDays] = useState(30);
  const [aov, setAov] = useState(150);
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);

  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [planName, setPlanName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const pctSum = channels.reduce((sum, c) => sum + c.pct, 0);

  function updateChannel(index: number, patch: Partial<Channel>) {
    setChannels((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function normalize() {
    if (pctSum === 0) return;
    setChannels((prev) => {
      const normalized = prev.map((c) => ({ ...c, pct: Math.round((c.pct / pctSum) * 10000) / 100 }));
      const roundedTotal = normalized.reduce((sum, c) => sum + c.pct, 0);
      const largestIndex = normalized.reduce((best, c, index, all) => (c.pct > all[best].pct ? index : best), 0);
      normalized[largestIndex] = {
        ...normalized[largestIndex],
        pct: Math.round((normalized[largestIndex].pct + (100 - roundedTotal)) * 100) / 100
      };
      return normalized;
    });
  }

  const rows: ChannelRow[] = useMemo(
    () =>
      channels.map((c) => {
        const channelBudget = totalBudget * (c.pct / 100);
        const estimatedClicks = c.cpc > 0 ? channelBudget / c.cpc : 0;
        const estimatedLeads = estimatedClicks * (c.conversionRate / 100);
        const costPerLead = estimatedLeads > 0 ? channelBudget / estimatedLeads : 0;
        const estimatedRevenue = estimatedLeads * aov;
        const roas = channelBudget > 0 ? estimatedRevenue / channelBudget : 0;
        return { ...c, channelBudget, estimatedClicks, estimatedLeads, costPerLead, estimatedRevenue, roas };
      }),
    [channels, totalBudget, aov]
  );

  const totalClicks = rows.reduce((s, r) => s + r.estimatedClicks, 0);
  const totalLeads = rows.reduce((s, r) => s + r.estimatedLeads, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.estimatedRevenue, 0);
  const allocatedBudget = rows.reduce((s, r) => s + r.channelBudget, 0);
  const avgCostPerLead = totalLeads > 0 ? allocatedBudget / totalLeads : 0;
  const overallRoas = allocatedBudget > 0 ? totalRevenue / allocatedBudget : 0;
  const dailyBudget = durationDays > 0 ? allocatedBudget / durationDays : 0;

  const weeks = useMemo(() => {
    const numWeeks = Math.max(1, Math.ceil(durationDays / 7));
    let cumulative = 0;
    return Array.from({ length: numWeeks }, (_, i) => {
      const daysInWeek = Math.min(7, durationDays - i * 7);
      const weekBudget = dailyBudget * daysInWeek;
      cumulative += weekBudget;
      return { week: i + 1, days: daysInWeek, budget: weekBudget, cumulative };
    });
  }, [durationDays, dailyBudget]);

  async function loadPlans() {
    try {
      setPlans(await apiFetch<SavedPlan[]>('/api/campaign-plans'));
    } catch (err) {
      /* saved plans are a nice-to-have, ignore failures */
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  async function savePlan() {
    setSaveError('');
    if (!planName.trim()) {
      setSaveError('الرجاء إدخال اسم الخطة / Please enter a plan name');
      return;
    }
    setSaving(true);
    try {
      await apiFetch<SavedPlan>('/api/campaign-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planName,
          inputs: { totalBudget, durationDays, aov, channels },
          computed: {
            rows,
            totals: { allocatedBudget, totalClicks, totalLeads, totalRevenue, overallRoas, avgCostPerLead, dailyBudget }
          }
        })
      });
      setPlanName('');
      loadPlans();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'تعذر الاتصال بالخادم / Cannot reach the server');
    } finally {
      setSaving(false);
    }
  }

  function loadPlan(plan: SavedPlan) {
    setTotalBudget(clampNumber(plan.inputs.totalBudget, 0, 1_000_000_000));
    setDurationDays(clampNumber(plan.inputs.durationDays, 1, 3650, true));
    setAov(clampNumber(plan.inputs.aov, 0, 100_000_000));
    const savedChannels =
      Array.isArray(plan.inputs.channels) && plan.inputs.channels.length > 0 ? plan.inputs.channels : DEFAULT_CHANNELS;
    setChannels(
      savedChannels.map((channel) => ({
        ...channel,
        pct: clampNumber(channel.pct, 0, 100),
        cpc: clampNumber(channel.cpc, 0, 1_000_000),
        conversionRate: clampNumber(channel.conversionRate, 0, 100)
      }))
    );
  }

  async function deletePlan(id: string) {
    setSaveError('');
    try {
      await apiFetch(`/api/campaign-plans/${id}`, { method: 'DELETE' });
      await loadPlans();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'تعذر حذف الخطة / Could not delete plan');
    }
  }

  return (
    <PageShell maxWidth="max-w-4xl">
      <BackLink />
      <h1 className="text-[1.5rem] sm:text-[1.75rem] font-medium text-[var(--text-primary)] tracking-tight mb-2">
        Campaign Budget Planner
      </h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-8">
        حاسبة الحملات والميزانيات / خطط ميزانية حملتك على القنوات المختلفة وشوف توقعات الوصول والإيراد.
      </p>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="text-[12px] text-[var(--text-secondary)]">
            الميزانية الكلية (SAR)
            <input
              type="number"
              min={0}
              value={totalBudget}
              onChange={(e) => setTotalBudget(clampNumber(e.target.value, 0, 1_000_000_000))}
              className="mt-1 w-full rounded-lg px-3 py-3 border border-[var(--line)] text-[16px] sm:text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-soft)]"
            />
          </label>
          <label className="text-[12px] text-[var(--text-secondary)]">
            مدة الحملة (أيام)
            <input
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => setDurationDays(clampNumber(e.target.value, 1, 3650, true))}
              className="mt-1 w-full rounded-lg px-3 py-3 border border-[var(--line)] text-[16px] sm:text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-soft)]"
            />
          </label>
          <label className="text-[12px] text-[var(--text-secondary)]">
            متوسط قيمة الطلب AOV (SAR)
            <input
              type="number"
              min={0}
              value={aov}
              onChange={(e) => setAov(clampNumber(e.target.value, 0, 100_000_000))}
              className="mt-1 w-full rounded-lg px-3 py-3 border border-[var(--line)] text-[16px] sm:text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-soft)]"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'ميزانية يومية', value: `${formatNumber(dailyBudget)} SAR` },
          { label: 'نقرات متوقعة', value: formatNumber(totalClicks) },
          { label: 'عملاء محتملون', value: formatNumber(totalLeads) },
          { label: 'متوسط تكلفة العميل', value: `${formatNumber(avgCostPerLead)} SAR` },
          { label: 'إيراد متوقع', value: `${formatNumber(totalRevenue)} SAR` },
          { label: 'ROAS', value: `${overallRoas.toFixed(2)}x` }
        ].map((s) => (
          <div key={s.label} className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4">
            <p className="text-[11px] text-[var(--text-muted)] mb-1">{s.label}</p>
            <p className="text-[16px] font-medium text-[var(--text-primary)]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-medium text-[var(--text-primary)]">توزيع القنوات / Channel Split</h3>
          <button
            onClick={normalize}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
          >
            <RefreshCw size={12} />
            ضبط لـ 100% ({pctSum}%)
          </button>
        </div>

        <div className="space-y-5">
          {rows.map((row, i) => (
            <div key={row.name} className="border border-[var(--line)] rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-3">
                <span className="text-[13px] font-medium text-[var(--text-primary)]">{row.name}</span>
                <span className="text-[11.5px] text-[var(--text-muted)] sm:text-right leading-relaxed">
                  {formatNumber(row.channelBudget)} SAR · {formatNumber(row.estimatedClicks)} نقرة ·{' '}
                  {formatNumber(row.estimatedLeads)} عميل · {formatNumber(row.costPerLead)} SAR/عميل ·{' '}
                  {formatNumber(row.estimatedRevenue)} SAR إيراد · {row.roas.toFixed(2)}x ROAS
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <label className="text-[11px] text-[var(--text-muted)]">
                  النسبة %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={row.pct}
                    onChange={(e) => updateChannel(i, { pct: clampNumber(e.target.value, 0, 100) })}
                    className="mt-1 w-full rounded-lg px-2 py-2 border border-[var(--line)] text-[16px] sm:text-[12.5px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-soft)]"
                  />
                </label>
                <label className="text-[11px] text-[var(--text-muted)]">
                  CPC (SAR)
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={row.cpc}
                    onChange={(e) => updateChannel(i, { cpc: clampNumber(e.target.value, 0, 1_000_000) })}
                    className="mt-1 w-full rounded-lg px-2 py-2 border border-[var(--line)] text-[16px] sm:text-[12.5px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-soft)]"
                  />
                </label>
                <label className="text-[11px] text-[var(--text-muted)]">
                  معدل التحويل %
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={row.conversionRate}
                    onChange={(e) =>
                      updateChannel(i, { conversionRate: clampNumber(e.target.value, 0, 100) })
                    }
                    className="mt-1 w-full rounded-lg px-2 py-2 border border-[var(--line)] text-[16px] sm:text-[12.5px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-soft)]"
                  />
                </label>
              </div>

              <div className="bg-[var(--chip)] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[var(--primary)] h-full rounded-full transition-all duration-200" style={{ width: `${Math.min(100, row.pct)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {Math.abs(pctSum - 100) > 0.001 && (
          <p className="text-[11.5px] text-amber-600 mt-4">
            مجموع النسب {Math.round(pctSum * 100) / 100}% وليس 100% — الملخص يعرض المبلغ الموزع فعليًا. اضغط ضبط لـ 100%.
          </p>
        )}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 mb-5">
        <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-4">جدول الصرف الأسبوعي / Weekly Pacing</h3>
        <div className="space-y-2">
          {weeks.map((w) => (
            <div key={w.week} className="flex items-center justify-between text-[12.5px] py-1.5 border-b border-[var(--line)] last:border-0">
              <span className="text-[var(--text-secondary)]">الأسبوع {w.week} ({w.days} يوم)</span>
              <span className="text-[var(--text-secondary)]">{formatNumber(w.budget)} SAR</span>
              <span className="text-[var(--text-muted)]">تراكمي: {formatNumber(w.cumulative)} SAR</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 mb-5">
        <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-4">حفظ الخطة / Save Plan</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="اسم الخطة (مثال: حملة رمضان) / Plan name"
            className="flex-1 rounded-xl px-4 py-3 border border-[var(--line)] text-[16px] sm:text-[13px] focus:outline-none focus:border-[var(--primary-soft)]"
          />
          <button
            onClick={savePlan}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-white bg-[var(--primary)] rounded-xl px-6 py-2.5 hover:bg-[var(--primary-hover)] transition-colors duration-200 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ / Save
          </button>
        </div>
        {saveError && <p className="text-[12px] text-red-600 mt-2">{saveError}</p>}
      </div>

      {plans.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6">
          <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-4">الخطط المحفوظة / Saved Plans</h3>
          <div className="space-y-2">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between text-[12.5px] py-2 border-b border-[var(--line)] last:border-0">
                <div className="min-w-0">
                  <p className="text-[var(--text-primary)] font-medium truncate">{plan.name}</p>
                  <p className="text-[var(--text-muted)] text-[11px]">
                    {formatNumber(plan.inputs.totalBudget)} SAR ·{' '}
                    {new Date(plan.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => loadPlan(plan)}
                    title="تحميل / Load"
                    className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary-soft)] transition-colors duration-200"
                  >
                    <FolderOpen size={14} />
                  </button>
                  <a
                    href={apiUrl(`/api/campaign-plans/${plan.id}/export.xlsx`)}
                    title="تصدير / Export"
                    className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-secondary)] hover:text-emerald-600 hover:border-emerald-300 transition-colors duration-200"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    onClick={() => deletePlan(plan.id)}
                    title="حذف / Delete"
                    className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-secondary)] hover:text-red-600 hover:border-red-300 transition-colors duration-200"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
