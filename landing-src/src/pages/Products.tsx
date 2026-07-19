import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { MessageCircle, Search, Calculator, CalendarClock, ArrowUpRight } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useLanguage } from '../context/LanguageContext';

type Product = {
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  icon: LucideIcon;
  href: string;
  external: boolean;
};

const PRODUCTS: Product[] = [
  {
    title: { ar: 'إرسال واتساب جماعي', en: 'WhatsApp Bulk Sender' },
    description: {
      ar: 'أرسل رسالة واحدة لقائمة أرقام من ملف Excel بأمان ومتابعة حية.',
      en: 'Send one message to a list of numbers from an Excel file, safely and with live tracking.'
    },
    icon: MessageCircle,
    href: '/app.html',
    external: true
  },
  {
    title: { ar: 'تحليل المتاجر', en: 'Store Analyzer' },
    description: {
      ar: 'ارفع رابط متجرك أو موقعك واحصل على تقييم فوري مع توصيات للتحسين.',
      en: 'Paste your store or website URL and get an instant audit with improvement recommendations.'
    },
    icon: Search,
    href: '/store-analyzer',
    external: false
  },
  {
    title: { ar: 'حاسبة الحملات والميزانيات', en: 'Campaign Budget Planner' },
    description: {
      ar: 'خطط ميزانية حملتك على القنوات المختلفة وشوف توقعات الوصول والتكلفة.',
      en: 'Plan your campaign budget across channels and see projected reach and cost.'
    },
    icon: Calculator,
    href: '/campaign-calculator',
    external: false
  },
  {
    title: { ar: 'جدولة محتوى السوشيال ميديا', en: 'Social Content Scheduler' },
    description: {
      ar: 'جهّز وجدول منشوراتك لكل منصة، وجاهزة للنسخ والنشر اليدوي.',
      en: 'Draft and schedule your posts for each platform, ready to copy and post manually.'
    },
    icon: CalendarClock,
    href: '/content-scheduler',
    external: false
  }
];

const COPY = {
  ar: {
    title: 'منتجات DMS',
    subtitle: 'أدوات صغيرة، لكل عمل ما يحتاجه فعلاً.'
  },
  en: {
    title: 'DMS Products',
    subtitle: 'Small tools, built for what a real business actually needs.'
  }
};

export default function Products() {
  const { lang } = useLanguage();
  const t = COPY[lang];

  return (
    <PageShell maxWidth="max-w-5xl">
      <h1 className="text-[1.5rem] sm:text-[1.75rem] font-medium text-[var(--text-primary)] tracking-tight mb-2">
        {t.title}
      </h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-8 sm:mb-10">{t.subtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {PRODUCTS.map((p) => {
          const Icon = p.icon;
          const cardBody = (
            <>
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex items-center justify-center rounded-full w-11 h-11"
                  style={{ backgroundColor: 'var(--chip)' }}
                >
                  <Icon size={18} className="text-[var(--text-secondary)]" />
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors duration-200"
                />
              </div>
              <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">{p.title[lang]}</h3>
              <p className="text-[12.5px] text-[var(--text-muted)] leading-relaxed">{p.description[lang]}</p>
            </>
          );
          const cardClass =
            'group block bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 active:scale-[0.98] hover:border-[var(--primary-soft)] hover:shadow-sm transition-all duration-200';

          return p.external ? (
            <a key={p.href} href={p.href} className={cardClass}>
              {cardBody}
            </a>
          ) : (
            <Link key={p.href} to={p.href} className={cardClass}>
              {cardBody}
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
