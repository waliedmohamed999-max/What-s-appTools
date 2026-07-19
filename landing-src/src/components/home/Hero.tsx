import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const TOOL_URL = '/app.html';

const COPY = {
  ar: {
    badge: 'أدوات تسويق رقمي للمشاريع الصغيرة',
    eyebrow: 'لأصحاب المشاريع الصغيرة والبائعين المستقلين',
    headingA: 'وصّل لكل عميلك على ',
    headingGradient: 'واتساب',
    headingB: ' برسالة واحدة بس.',
    subheading: 'من غير برمجة. من غير رسوم لكل رسالة.',
    getStarted: 'ابدأ الآن',
    seeTools: 'شوف الأدوات',
    trust: ['بدون تثبيت', 'عربي وإنجليزي', 'خصوصية كاملة — بياناتك عندك']
  },
  en: {
    badge: 'Digital marketing tools for small businesses',
    eyebrow: 'For small businesses & solo sellers',
    headingA: 'Reach every customer on ',
    headingGradient: 'WhatsApp',
    headingB: ' with one simple message.',
    subheading: 'No coding. No per-message fees.',
    getStarted: 'Get started',
    seeTools: 'See the tools',
    trust: ['Nothing to install', 'Arabic & English', 'Fully private — your data stays yours']
  }
};

export default function Hero({ children }: { children?: ReactNode }) {
  const { lang } = useLanguage();
  const t = COPY[lang];
  const arrow = lang === 'ar' ? '←' : '→';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -start-32 w-[32rem] h-[32rem] rounded-full bg-[rgba(var(--primary-rgb),0.25)] blur-3xl animate-blob" />
        <div
          className="absolute top-1/3 -end-40 w-[28rem] h-[28rem] rounded-full bg-[rgba(var(--accent-rgb),0.2)] blur-3xl animate-blob"
          style={{ animationDelay: '-6s' }}
        />
        <div
          className="absolute -bottom-24 start-1/4 w-[24rem] h-[24rem] rounded-full bg-[rgba(var(--primary-rgb),0.15)] blur-3xl animate-blob"
          style={{ animationDelay: '-11s' }}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {children}

        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[rgba(var(--surface-rgb),0.8)] backdrop-blur px-3.5 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)] mb-5">
              <Sparkles size={13} className="text-[var(--accent)]" />
              {t.badge}
            </div>

            <h1 className="text-[2.1rem] sm:text-[2.75rem] lg:text-[3.25rem] leading-[1.12] font-extrabold text-[var(--text-primary)] tracking-tight mb-4">
              {t.headingA}
              <span className="text-gradient">{t.headingGradient}</span>
              {t.headingB}
            </h1>

            <p className="text-[14px] sm:text-[15px] text-[var(--text-secondary)] mb-7">{t.subheading}</p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-7">
              <a
                href={TOOL_URL}
                className="inline-flex items-center gap-2 text-[13.5px] font-medium text-white bg-[var(--primary)] rounded-full px-6 py-3 shadow-[0_8px_24px_-8px_rgba(var(--primary-rgb),0.6)] hover:bg-[var(--primary-hover)] hover:shadow-[0_10px_28px_-6px_rgba(var(--primary-rgb),0.7)] transition-all duration-200 group"
              >
                {t.getStarted}
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">{arrow}</span>
              </a>
              <a
                href="#tools"
                className="inline-flex items-center gap-2 text-[13.5px] font-medium text-[var(--text-primary)] border border-[var(--line)] bg-[var(--surface)] rounded-full px-6 py-3 hover:border-[rgba(var(--primary-rgb),0.4)] hover:text-[var(--primary)] transition-all duration-200"
              >
                {t.seeTools}
              </a>
            </div>

            <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
              {t.trust.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)]">
                  <span className="inline-block w-1 h-1 rounded-full bg-[var(--primary)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
