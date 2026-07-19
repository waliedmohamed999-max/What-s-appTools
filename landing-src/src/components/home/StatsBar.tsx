import { useLanguage } from '../../context/LanguageContext';

const STATS = [
  { value: '4', label: { ar: 'أدوات في مكان واحد', en: 'Tools in one place' } },
  { value: '0', label: { ar: 'رسوم لكل رسالة', en: 'Per-message fees' } },
  { value: '2', label: { ar: 'لغة، عربي وإنجليزي', en: 'Languages, AR & EN' } },
  { value: '100%', label: { ar: 'بياناتك تبقى عندك', en: 'Your data stays yours' } }
];

export default function StatsBar() {
  const { lang } = useLanguage();

  return (
    <section className="border-y border-black/5 bg-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-10 py-8 sm:py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
        {STATS.map((stat) => (
          <div key={stat.label.en} className="text-center sm:text-start">
            <div className="text-[1.6rem] sm:text-[1.75rem] font-medium text-gray-900 tracking-tight">
              {stat.value}
            </div>
            <div className="text-[12px] text-gray-400 mt-1">{stat.label[lang]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
