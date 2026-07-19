import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

const STEPS = [
  {
    ar: { title: 'اختار الأداة المناسبة', body: 'إرسال واتساب، تحليل متجر، ميزانية حملة، أو جدولة محتوى.' },
    en: { title: 'Pick the right tool', body: 'WhatsApp sending, store analysis, campaign budget, or content scheduling.' }
  },
  {
    ar: { title: 'جهّز بياناتك', body: 'ملف Excel بالأرقام، رابط متجرك، أو رقم الميزانية — كله بسيط.' },
    en: { title: 'Bring your data', body: 'An Excel file of numbers, your store URL, or a budget figure — that simple.' }
  },
  {
    ar: { title: 'نفّذ واستلم النتيجة فورًا', body: 'من غير انتظار، ومن غير خطوات تقنية معقدة.' },
    en: { title: 'Run it, get results instantly', body: 'No waiting around, no complicated technical steps.' }
  }
];

const COPY = {
  ar: { title: 'إزاي تشتغل', subtitle: 'ثلاث خطوات بسيطة من أي أداة لحد النتيجة.' },
  en: { title: 'How it works', subtitle: 'Three simple steps from any tool to a result.' }
};

export default function HowItWorks() {
  const { lang } = useLanguage();
  const t = COPY[lang];
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = refs.current.indexOf(entry.target as HTMLDivElement);
          if (index !== -1) setActiveIndex(index);
        });
      },
      { threshold: 0.6 }
    );
    refs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="glass-panel border-y border-white/40">
      <div className="max-w-5xl mx-auto px-5 sm:px-10 py-16 sm:py-20">
        <h2 className="text-[1.4rem] sm:text-[1.6rem] font-bold text-[var(--text-primary)] tracking-tight mb-2">
          {t.title}
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] mb-8 sm:mb-10">{t.subtitle}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          {STEPS.map((step, index) => {
            const active = index === activeIndex;
            return (
              <div
                key={step.en.title}
                ref={(node) => {
                  refs.current[index] = node;
                }}
                className="relative transition-opacity duration-300"
                style={{ opacity: active ? 1 : 0.55 }}
              >
                <div
                  className="glass-chip flex items-center justify-center rounded-full w-12 h-12 mb-3 text-[15px] font-extrabold tabular-nums transition-colors duration-300"
                  style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}
                >
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1.5">{step[lang].title}</h3>
                <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">{step[lang].body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
