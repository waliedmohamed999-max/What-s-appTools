import { useLanguage } from '../../context/LanguageContext';

// Store Analyzer's real, working platform detection (server/storeAnalyzer.js) — this
// row is deliberately not a "trusted by" / "integrated with" partner logo strip, since
// DMS has no such partnerships. It's an honest statement of what the tool actually does.
const PLATFORMS = ['Salla', 'Zid', 'Shopify', 'WooCommerce', 'WordPress', 'Wix'];

const COPY = {
  ar: 'أداة تحليل المتاجر بتتعرف تلقائيًا على متاجر مبنية على:',
  en: 'Store Analyzer automatically recognizes stores built on:'
};

function PlatformGroup() {
  return (
    <div className="flex gap-12 sm:gap-16 pe-12 sm:pe-16 shrink-0">
      {PLATFORMS.map((name) => (
        <span
          key={name}
          className="text-[17px] sm:text-[19px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200 whitespace-nowrap"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export default function PlatformMarquee() {
  const { lang } = useLanguage();
  const animation = lang === 'ar' ? 'animate-marquee-reverse' : 'animate-marquee';

  return (
    <section className="glass-panel border-y border-white/40 py-8 sm:py-10">
      <p className="text-center text-[12px] text-[var(--text-muted)] mb-5 px-5">{COPY[lang]}</p>
      <div className="pause-on-hover overflow-hidden">
        {/* Two identical groups, each owning its own trailing gap (pe-*) rather than a
            parent `gap`, so the two halves are pixel-identical and translateX(-50%)
            lands exactly on the seam instead of jumping. */}
        <div className={`flex w-max ${animation}`}>
          <PlatformGroup />
          <PlatformGroup />
        </div>
      </div>
    </section>
  );
}
