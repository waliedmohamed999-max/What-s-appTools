import { useLanguage } from '../../context/LanguageContext';
import { useCountUp } from '../../hooks/useCountUp';

const STATS = [
  { value: '4', label: { ar: 'أدوات في مكان واحد', en: 'Tools in one place' } },
  { value: '0', label: { ar: 'رسوم لكل رسالة', en: 'Per-message fees' } },
  { value: '2', label: { ar: 'لغة، عربي وإنجليزي', en: 'Languages, AR & EN' } },
  { value: '100%', label: { ar: 'بياناتك تبقى عندك', en: 'Your data stays yours' } }
];

function Stat({ value, label }: { value: string; label: string }) {
  const { ref, display } = useCountUp(value);
  return (
    <div ref={ref} className="glass-panel rounded-2xl px-4 py-6 text-center">
      <div className="text-[1.75rem] sm:text-[2rem] font-extrabold text-[var(--text-primary)] tracking-tight tabular-nums">
        {display}
      </div>
      <div className="text-[12px] text-[var(--text-muted)] mt-1">{label}</div>
    </div>
  );
}

export default function StatsBar() {
  const { lang } = useLanguage();

  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-10 py-10 sm:py-14">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {STATS.map((stat) => (
          <Stat key={stat.label.en} value={stat.value} label={stat.label[lang]} />
        ))}
      </div>
    </section>
  );
}
