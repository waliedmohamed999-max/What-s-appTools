import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { MessageCircle, Search, Calculator, CalendarClock, ArrowUpRight } from 'lucide-react';
import PageShell from '../components/PageShell';

type Product = {
  title: string;
  titleAr: string;
  descriptionAr: string;
  icon: LucideIcon;
  href: string;
  external: boolean;
};

const PRODUCTS: Product[] = [
  {
    title: 'WhatsApp Bulk Sender',
    titleAr: 'إرسال واتساب جماعي',
    descriptionAr: 'أرسل رسالة واحدة لقائمة أرقام من ملف Excel بأمان ومتابعة حية.',
    icon: MessageCircle,
    href: '/app.html',
    external: true
  },
  {
    title: 'Store Analyzer',
    titleAr: 'تحليل المتاجر',
    descriptionAr: 'ارفع رابط متجرك أو موقعك واحصل على تقييم فوري مع توصيات للتحسين.',
    icon: Search,
    href: '/store-analyzer',
    external: false
  },
  {
    title: 'Campaign Budget Planner',
    titleAr: 'حاسبة الحملات والميزانيات',
    descriptionAr: 'خطط ميزانية حملتك على القنوات المختلفة وشوف توقعات الوصول والتكلفة.',
    icon: Calculator,
    href: '/campaign-calculator',
    external: false
  },
  {
    title: 'Social Content Scheduler',
    titleAr: 'جدولة محتوى السوشيال ميديا',
    descriptionAr: 'جهّز وجدول منشوراتك لكل منصة، وجاهزة للنسخ والنشر اليدوي.',
    icon: CalendarClock,
    href: '/content-scheduler',
    external: false
  }
];

export default function Products() {
  return (
    <PageShell maxWidth="max-w-5xl">
      <h1 className="text-[1.5rem] sm:text-[1.75rem] font-medium text-gray-900 tracking-tight mb-2">
        DMS Products
      </h1>
      <p className="text-[13px] text-gray-400 mb-8 sm:mb-10">
        أدوات صغيرة، لكل عمل ما يحتاجه فعلاً / Small tools, built for what a real business actually needs.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {PRODUCTS.map((p) => {
          const Icon = p.icon;
          const cardBody = (
            <>
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex items-center justify-center rounded-full w-11 h-11"
                  style={{ backgroundColor: '#EDEDED' }}
                >
                  <Icon size={18} className="text-gray-700" />
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-gray-300 group-hover:text-blue-500 transition-colors duration-200"
                />
              </div>
              <h3 className="text-[15px] font-medium text-gray-900 mb-1">{p.title}</h3>
              <p className="text-[12.5px] text-gray-500 mb-2">{p.titleAr}</p>
              <p className="text-[12.5px] text-gray-400 leading-relaxed">{p.descriptionAr}</p>
            </>
          );
          const cardClass =
            'group block bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 active:scale-[0.98] hover:border-blue-300 hover:shadow-sm transition-all duration-200';

          return p.external ? (
            <a key={p.title} href={p.href} className={cardClass}>
              {cardBody}
            </a>
          ) : (
            <Link key={p.title} to={p.href} className={cardClass}>
              {cardBody}
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
