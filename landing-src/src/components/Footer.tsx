import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const LINKS: { ar: string; en: string; href: string }[] = [
  { ar: 'المنتجات', en: 'Products', href: '/products' },
  { ar: 'تحليل المتاجر', en: 'Store Analyzer', href: '/store-analyzer' },
  { ar: 'الحملات', en: 'Campaigns', href: '/campaign-calculator' },
  { ar: 'المحتوى', en: 'Content', href: '/content-scheduler' }
];

const COPY = {
  ar: {
    tagline: 'أدوات تسويق رقمي بسيطة لأصحاب المشاريع الصغيرة والبائعين المستقلين.',
    linksTitle: 'الأدوات',
    contactTitle: 'تواصل معنا',
    rights: (year: number) => `© ${year} DMS. جميع الحقوق محفوظة.`
  },
  en: {
    tagline: 'Simple digital marketing tools for small businesses and solo sellers.',
    linksTitle: 'Tools',
    contactTitle: 'Contact',
    rights: (year: number) => `© ${year} DMS. All rights reserved.`
  }
};

const WHATSAPP_NUMBER = '966509095816';
const CONTACT_EMAIL = 'info@dms1t.com';

export default function Footer() {
  const { lang } = useLanguage();
  const t = COPY[lang];
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-10 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          <div>
            <div className="inline-flex items-center justify-center rounded-xl w-16 h-11 bg-gray-900 mb-3">
              <span className="text-[13px] font-bold tracking-[0.12em] text-white">DMS</span>
            </div>
            <p className="text-[12.5px] text-gray-400 leading-relaxed max-w-[220px]">{t.tagline}</p>
          </div>

          <div>
            <h3 className="text-[13px] font-medium text-gray-900 mb-3">{t.linksTitle}</h3>
            <ul className="flex flex-col gap-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-[12.5px] text-gray-500 hover:text-gray-900 transition-colors duration-200"
                  >
                    {lang === 'ar' ? link.ar : link.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[13px] font-medium text-gray-900 mb-3">{t.contactTitle}</h3>
            <ul className="flex flex-col gap-2">
              <li>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12.5px] text-gray-500 hover:text-gray-900 transition-colors duration-200"
                  dir="ltr"
                >
                  +{WHATSAPP_NUMBER}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-[12.5px] text-gray-500 hover:text-gray-900 transition-colors duration-200"
                  dir="ltr"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="text-[11.5px] text-gray-300 mt-10 pt-6 border-t border-black/5">
          {t.rights(year)}
        </p>
      </div>
    </footer>
  );
}
