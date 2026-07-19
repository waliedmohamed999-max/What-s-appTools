import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Zap, ShieldCheck, Layers, Globe2, Lock, Coins } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

type Feature = { icon: LucideIcon; title: { ar: string; en: string }; body: { ar: string; en: string } };

const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: { ar: 'بدون برمجة', en: 'No coding required' },
    body: {
      ar: 'كل أداة واجهة بسيطة — ارفع ملف، حط رابط، أو املا رقم، وخلاص.',
      en: "Every tool is a simple interface — upload a file, paste a link, or fill in a number, that's it."
    }
  },
  {
    icon: ShieldCheck,
    title: { ar: 'تأخير آمن لواتساب', en: 'Safe sending delays' },
    body: {
      ar: 'تأخير طبيعي بين الرسائل وحد أقصى للدفعة، عشان رقمك يفضل آمن قد ما نقدر.',
      en: 'Human-like delays between messages and a batch cap, to keep your number as safe as possible.'
    }
  },
  {
    icon: Layers,
    title: { ar: 'أربع أدوات في مكان واحد', en: 'Four tools, one place' },
    body: {
      ar: 'مش محتاج تشترك في أدوات متفرقة — كل اللي محتاجه موجود هنا.',
      en: 'No need to subscribe to scattered tools — everything you need is right here.'
    }
  },
  {
    icon: Globe2,
    title: { ar: 'عربي وإنجليزي', en: 'Arabic & English' },
    body: {
      ar: 'الصفحة الرئيسية بالكامل بلغتين، وبتفتكر اختيارك في كل زيارة.',
      en: 'The whole landing page works in both languages, and remembers your choice on every visit.'
    }
  },
  {
    icon: Lock,
    title: { ar: 'بدون حسابات أو تتبع', en: 'No accounts, no tracking' },
    body: {
      ar: 'مفيش تسجيل دخول، مفيش بياناتك بتتباع أو تتشارك مع جهة تالتة.',
      en: 'No login screens, and your data is never sold or shared with third parties.'
    }
  },
  {
    icon: Coins,
    title: { ar: 'بدون رسوم لكل رسالة', en: 'No per-message fees' },
    body: {
      ar: 'ابعت لأي عدد من الأرقام من غير ما تدفع رسوم إضافية على كل رسالة.',
      en: 'Send to any number of contacts without paying extra fees per message.'
    }
  }
];

const COPY = {
  ar: { title: 'ليه DMS', subtitle: 'مبني عشان يخدم أصحاب المشاريع الصغيرة فعلاً، مش عشان يبيعلك ميزات مش محتاجها.' },
  en: {
    title: 'Why DMS',
    subtitle: "Built to actually serve small businesses, not to sell you features you don't need."
  }
};

export default function WhyDms() {
  const { lang } = useLanguage();
  const t = COPY[lang];
  const [active, setActive] = useState(0);
  const ActiveIcon = FEATURES[active].icon;

  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-10 py-16 sm:py-20">
      <h2 className="text-[1.4rem] sm:text-[1.6rem] font-bold text-[var(--text-primary)] tracking-tight mb-2">
        {t.title}
      </h2>
      <p className="text-[13px] text-[var(--text-secondary)] mb-8 sm:mb-10 max-w-md">{t.subtitle}</p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-5">
        <div className="lg:col-span-2 flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            const isActive = index === active;
            return (
              <button
                key={feature.title.en}
                type="button"
                onClick={() => setActive(index)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-start shrink-0 lg:shrink transition-all duration-200 border"
                style={{
                  backgroundColor: isActive ? 'var(--surface)' : 'transparent',
                  borderColor: isActive ? 'var(--line)' : 'transparent',
                  boxShadow: isActive ? '0 8px 20px -14px rgba(0,0,0,0.25)' : 'none'
                }}
              >
                <span
                  className={`flex items-center justify-center rounded-full w-8 h-8 shrink-0 transition-all duration-200 ${
                    isActive ? 'glass-chip' : ''
                  }`}
                >
                  <Icon size={15} style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }} />
                </span>
                <span
                  className="text-[13px] font-medium whitespace-nowrap lg:whitespace-normal"
                  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  {feature.title[lang]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col justify-center min-h-[180px]">
          <div className="glass-chip flex items-center justify-center rounded-full w-12 h-12 mb-4">
            <ActiveIcon size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-2">
            {FEATURES[active].title[lang]}
          </h3>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{FEATURES[active].body[lang]}</p>
        </div>
      </div>
    </section>
  );
}
