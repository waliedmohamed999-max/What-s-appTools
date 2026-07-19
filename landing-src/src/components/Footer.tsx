import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../lib/api';

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
    newsletterTitle: 'ابقى على اطلاع',
    newsletterBody: 'إيميلك بس، وهنبعتلك لما نضيف أداة جديدة.',
    emailPlaceholder: 'بريدك الإلكتروني',
    subscribe: 'اشترك',
    subscribed: 'تم! شكرًا لاشتراكك.',
    rights: (year: number) => `© ${year} DMS. جميع الحقوق محفوظة.`
  },
  en: {
    tagline: 'Simple digital marketing tools for small businesses and solo sellers.',
    linksTitle: 'Tools',
    contactTitle: 'Contact',
    newsletterTitle: 'Stay in the loop',
    newsletterBody: "Just your email — we'll let you know when a new tool ships.",
    emailPlaceholder: 'Your email',
    subscribe: 'Subscribe',
    subscribed: "Done! Thanks for subscribing.",
    rights: (year: number) => `© ${year} DMS. All rights reserved.`
  }
};

const WHATSAPP_NUMBER = '966509095816';
const CONTACT_EMAIL = 'info@dms1t.com';

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M16.001 3C9.107 3 3.5 8.607 3.5 15.5c0 2.385.664 4.62 1.816 6.527L3 29l7.163-2.278A12.44 12.44 0 0 0 16 28c6.894 0 12.5-5.607 12.5-12.5S22.895 3 16.001 3Zm0 22.7a10.14 10.14 0 0 1-5.164-1.41l-.37-.22-4.25 1.352 1.379-4.142-.24-.386a10.14 10.14 0 0 1-1.556-5.394c0-5.616 4.585-10.2 10.201-10.2 5.616 0 10.2 4.584 10.2 10.2 0 5.615-4.584 10.2-10.2 10.2Zm5.593-7.646c-.306-.153-1.81-.893-2.09-.995-.28-.102-.484-.153-.688.153-.204.306-.79.994-.968 1.198-.178.204-.357.23-.663.077-.306-.153-1.293-.477-2.463-1.52-.91-.812-1.524-1.815-1.703-2.121-.178-.306-.019-.472.134-.624.138-.137.306-.357.459-.535.153-.179.204-.306.306-.51.102-.204.051-.383-.026-.536-.077-.153-.688-1.658-.943-2.271-.248-.596-.5-.516-.688-.526l-.586-.01c-.204 0-.535.077-.815.383-.28.306-1.068 1.044-1.068 2.548 0 1.503 1.093 2.956 1.245 3.16.153.204 2.15 3.283 5.209 4.604.728.314 1.296.502 1.739.642.731.232 1.396.199 1.922.121.586-.088 1.81-.74 2.065-1.454.255-.714.255-1.325.178-1.454-.077-.128-.28-.204-.586-.357Z" />
    </svg>
  );
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      aria-label={label}
      title={label}
      className="flex items-center justify-center w-9 h-9 rounded-full border border-[var(--line)] text-[var(--text-secondary)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-all duration-200"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  const { lang } = useLanguage();
  const t = COPY[lang];
  const year = new Date().getFullYear();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  async function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    try {
      await apiFetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lang === 'ar' ? 'مشترك نشرة DMS' : 'DMS newsletter subscriber',
          email,
          message: 'Newsletter signup'
        })
      });
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="max-w-5xl mx-auto px-5 sm:px-10 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6">
          <div>
            <div className="inline-flex items-center justify-center rounded-xl w-16 h-11 bg-[var(--text-primary)] mb-3">
              <span className="text-[13px] font-bold tracking-[0.12em] text-white">DMS</span>
            </div>
            <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed max-w-[220px] mb-4">
              {t.tagline}
            </p>
            <div className="flex items-center gap-2">
              <SocialIcon href={`https://wa.me/${WHATSAPP_NUMBER}`} label="WhatsApp">
                <WhatsAppIcon />
              </SocialIcon>
              <SocialIcon href={`mailto:${CONTACT_EMAIL}`} label="Email">
                <Mail size={15} />
              </SocialIcon>
            </div>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">{t.linksTitle}</h3>
            <ul className="flex flex-col gap-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
                  >
                    {lang === 'ar' ? link.ar : link.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">{t.contactTitle}</h3>
            <ul className="flex flex-col gap-2">
              <li>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
                  dir="ltr"
                >
                  +{WHATSAPP_NUMBER}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
                  dir="ltr"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">{t.newsletterTitle}</h3>
            <p className="text-[12px] text-[var(--text-secondary)] mb-3 leading-relaxed">{t.newsletterBody}</p>
            {status === 'success' ? (
              <p className="text-[12px] text-emerald-600">{t.subscribed}</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex items-center gap-1.5">
                <input
                  type="email"
                  required
                  dir="ltr"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[12px] focus-glow"
                />
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  aria-label={t.subscribe}
                  className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors duration-200 disabled:opacity-60"
                >
                  <Send size={13} />
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-[11.5px] text-[var(--text-muted)] mt-10 pt-6 border-t border-[var(--line)]">
          {t.rights(year)}
        </p>
      </div>
    </footer>
  );
}
