import { Link } from 'react-router-dom';
import Logo from './Logo';
import { useLanguage } from '../context/LanguageContext';

const NAV_LINKS: { ar: string; en: string; href: string }[] = [
  { ar: 'المنتجات', en: 'Products', href: '/products' },
  { ar: 'تحليل المتاجر', en: 'Store Analyzer', href: '/store-analyzer' },
  { ar: 'الحملات', en: 'Campaigns', href: '/campaign-calculator' },
  { ar: 'المحتوى', en: 'Content', href: '/content-scheduler' }
];

export default function Nav({ sticky = false }: { sticky?: boolean }) {
  const { lang, toggleLang } = useLanguage();

  return (
    <nav
      className={
        sticky
          ? 'sticky top-0 z-20 flex items-center justify-center py-3 sm:py-4 px-4 sm:px-8 gap-2 sm:gap-3 backdrop-blur-md bg-[#f0f0ee]/90 border-b border-black/5'
          : 'flex items-center justify-center pt-4 sm:pt-6 px-4 sm:px-8 gap-2 sm:gap-3'
      }
    >
      <Link
        to="/"
        aria-label="DMS home"
        className="flex items-center justify-center rounded-xl w-16 h-11 shrink-0 bg-gray-900"
      >
        <Logo />
      </Link>

      <Link
        to="/products"
        className="sm:hidden inline-flex items-center text-[13px] font-medium text-gray-700 rounded-xl px-4 py-3 shrink-0"
        style={{ backgroundColor: '#EDEDED' }}
      >
        {lang === 'ar' ? 'المنتجات' : 'Products'}
      </Link>

      <div
        className="hidden sm:flex items-center gap-6 md:gap-10 rounded-xl px-6 md:px-8 py-3"
        style={{ backgroundColor: '#EDEDED' }}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="text-[14px] font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
          >
            {lang === 'ar' ? link.ar : link.en}
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={toggleLang}
        aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        className="inline-flex items-center text-[13px] sm:text-[14px] font-medium text-gray-500 hover:text-gray-900 rounded-xl px-3 py-3 transition-colors duration-200 shrink-0"
        style={{ backgroundColor: '#EDEDED' }}
      >
        {lang === 'ar' ? 'EN' : 'عربي'}
      </button>

      <a
        href="/app.html"
        className="inline-flex items-center text-[13px] sm:text-[14px] font-medium text-blue-500 border border-blue-400 rounded-xl px-4 py-3 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 shrink-0"
      >
        <span className="sm:hidden">{lang === 'ar' ? 'الأداة' : 'Tool'}</span>
        <span className="hidden sm:inline">{lang === 'ar' ? 'افتح الأداة' : 'Open Tool'}</span>
      </a>
    </nav>
  );
}
