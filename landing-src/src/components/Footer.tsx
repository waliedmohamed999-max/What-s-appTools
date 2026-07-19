import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, Instagram, Facebook, Twitter, Linkedin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../lib/api';
import WhatsAppIcon from './icons/WhatsAppIcon';

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

// Content Scheduler's real, working platforms (see ContentScheduler.tsx) — an honest
// "you can post to" row, not a claim that DMS itself has accounts on these platforms.
const SCHEDULER_PLATFORMS = [
  { icon: Instagram, label: 'Instagram' },
  { icon: Facebook, label: 'Facebook' },
  { icon: Twitter, label: 'X / Twitter' },
  { icon: Linkedin, label: 'LinkedIn' }
];

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
            <div className="flex items-center gap-2 mb-4">
              <SocialIcon href={`https://wa.me/${WHATSAPP_NUMBER}`} label="WhatsApp">
                <WhatsAppIcon size={16} />
              </SocialIcon>
              <SocialIcon href={`mailto:${CONTACT_EMAIL}`} label="Email">
                <Mail size={15} />
              </SocialIcon>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] mb-2">
              {lang === 'ar' ? 'جدول منشوراتك على:' : 'Schedule posts for:'}
            </p>
            <div className="flex items-center gap-2.5">
              {SCHEDULER_PLATFORMS.map((p) => (
                <p.icon key={p.label} size={15} aria-label={p.label} className="text-[var(--text-muted)]" />
              ))}
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
