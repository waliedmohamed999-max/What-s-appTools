import type { LucideIcon } from 'lucide-react';
import { Search, Calculator, CalendarClock, Instagram, Facebook, Twitter, Linkedin } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import WhatsAppIcon from '../icons/WhatsAppIcon';

type Tool = {
  icon: LucideIcon | typeof WhatsAppIcon;
  brandColor?: string;
  href: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  cta: { ar: string; en: string };
  platforms?: LucideIcon[];
};

const TOOLS: Tool[] = [
  {
    icon: WhatsAppIcon,
    brandColor: '#25d366',
    href: '/app.html',
    title: { ar: 'إرسال واتساب جماعي', en: 'WhatsApp Bulk Sender' },
    description: {
      ar: 'ارفع قائمة أرقام من ملف Excel وابعت رسالة واحدة (مع صورة أو PDF لو حبيت) للكل، بتأخير طبيعي بين كل رسالة عشان رقمك يفضل آمن.',
      en: 'Upload a list of numbers from an Excel file and send one message — with an optional image or PDF — to everyone, with human-like delays between sends to keep your number safe.'
    },
    cta: { ar: 'افتح أداة الإرسال', en: 'Open the sender' }
  },
  {
    icon: Search,
    href: '/store-analyzer',
    title: { ar: 'تحليل المتاجر والمواقع', en: 'Store Analyzer' },
    description: {
      ar: 'حط رابط متجرك أو موقعك واحصل فورًا على تقييم من 0 إلى 100 لأربع محاور (SEO، تقني، ثقة، سوشيال) مع توصيات مرتبة حسب الأهمية.',
      en: 'Paste your store or website URL and get an instant 0–100 score across four categories (SEO, technical, trust, social) with severity-ranked recommendations.'
    },
    cta: { ar: 'حلّل متجرك الآن', en: 'Analyze your store' }
  },
  {
    icon: Calculator,
    href: '/campaign-calculator',
    title: { ar: 'حاسبة ميزانية الحملات', en: 'Campaign Budget Planner' },
    description: {
      ar: 'قسّم ميزانية التسويق على القنوات المختلفة واعرف توقعات النقرات والعملاء المحتملين والتكلفة والعائد، مع جدول أسبوعي لصرف الميزانية.',
      en: 'Split your marketing budget across channels and see projected clicks, leads, cost per lead, and ROAS — plus a weekly spend pacing table.'
    },
    cta: { ar: 'خطط ميزانيتك', en: 'Plan your budget' }
  },
  {
    icon: CalendarClock,
    href: '/content-scheduler',
    title: { ar: 'جدولة محتوى السوشيال ميديا', en: 'Social Content Scheduler' },
    description: {
      ar: 'جهّز منشوراتك لإنستجرام وفيسبوك وباقي المنصات مع صورة وتاريخ نشر، وشوفها في تقويم شهري، وانشرها مباشرة لو ربطت حساب فيسبوك/إنستجرام.',
      en: 'Draft posts for Instagram, Facebook, and more with an image and schedule, view them on a monthly calendar, and publish directly once you connect Facebook/Instagram.'
    },
    cta: { ar: 'جدول منشورك', en: 'Schedule a post' },
    platforms: [Instagram, Facebook, Twitter, Linkedin]
  }
];

const COPY = {
  ar: { title: 'الأدوات', subtitle: 'أربع أدوات بسيطة، كل واحدة بتحل مشكلة حقيقية لأي عمل صغير.' },
  en: { title: 'The tools', subtitle: 'Four simple tools, each solving a real problem for a small business.' }
};

export default function ToolsSection() {
  const { lang } = useLanguage();
  const t = COPY[lang];
  const arrow = lang === 'ar' ? '←' : '→';

  return (
    <section id="tools" className="max-w-5xl mx-auto px-5 sm:px-10 py-16 sm:py-20 scroll-mt-16">
      <h2 className="text-[1.4rem] sm:text-[1.6rem] font-bold text-[var(--text-primary)] tracking-tight mb-2">
        {t.title}
      </h2>
      <p className="text-[13px] text-[var(--text-secondary)] mb-8 sm:mb-10">{t.subtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {TOOLS.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.href}
              className="relative bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 flex flex-col hover:border-[rgba(var(--primary-rgb),0.4)] hover:shadow-[0_12px_32px_-16px_rgba(var(--primary-rgb),0.35)] transition-all duration-200"
            >
              <span className="absolute top-5 sm:top-6 end-5 sm:end-6 text-[11px] font-medium text-[var(--text-muted)] tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="glass-chip flex items-center justify-center rounded-full w-11 h-11 mb-4">
                <Icon size={18} style={{ color: tool.brandColor || 'var(--primary)' }} />
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">{tool.title[lang]}</h3>
              <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed mb-3 flex-1">
                {tool.description[lang]}
              </p>
              {tool.platforms && (
                <div className="flex items-center gap-2 mb-4">
                  {tool.platforms.map((PlatformIcon, i) => (
                    <PlatformIcon key={i} size={14} className="text-[var(--text-muted)]" />
                  ))}
                </div>
              )}
              <a
                href={tool.href}
                className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-[var(--primary)] border border-[rgba(var(--primary-rgb),0.4)] rounded-full px-4 py-2 hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-all duration-200 group"
              >
                {tool.cta[lang]}
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">{arrow}</span>
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
