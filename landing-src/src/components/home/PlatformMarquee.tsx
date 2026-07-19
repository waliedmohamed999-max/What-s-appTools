import { useLanguage } from '../../context/LanguageContext';

// Store Analyzer's real, working platform detection (server/storeAnalyzer.js) — this
// row is deliberately not a "trusted by" / "integrated with" partner logo strip, since
// DMS has no such partnerships. It's an honest statement of what the tool actually does.
const PLATFORMS = ['Salla', 'Zid', 'Shopify', 'WooCommerce', 'WordPress', 'Wix'];

const COPY = {
  ar: 'أداة تحليل المتاجر بتتعرف تلقائيًا على متاجر مبنية على:',
  en: 'Store Analyzer automatically recognizes stores built on:'
};

export default function PlatformMarquee() {
  const { lang } = useLanguage();
  const items = [...PLATFORMS, ...PLATFORMS];
  const animation = lang === 'ar' ? 'animate-marquee-reverse' : 'animate-marquee';

  return (
    <section className="bg-[var(--surface)] border-y border-[var(--line)] py-8 sm:py-10">
      <p className="text-center text-[12px] text-[var(--text-muted)] mb-5 px-5">{COPY[lang]}</p>
      <div className="pause-on-hover overflow-hidden">
        <div className={`flex w-max gap-12 sm:gap-16 ${animation}`}>
          {items.map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="text-[17px] sm:text-[19px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200 whitespace-nowrap"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
