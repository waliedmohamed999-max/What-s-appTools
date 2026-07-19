import { useState, type FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { MessageCircle, Search, Calculator, CalendarClock } from 'lucide-react';
import Nav from '../components/Nav';
import WhatsAppFloatButton from '../components/WhatsAppFloatButton';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../lib/api';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4';

const TOOL_URL = '/app.html';

type Tool = {
  icon: LucideIcon;
  href: string;
  external: boolean;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  cta: { ar: string; en: string };
};

const TOOLS: Tool[] = [
  {
    icon: MessageCircle,
    href: '/app.html',
    external: true,
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
    external: false,
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
    external: false,
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
    external: false,
    title: { ar: 'جدولة محتوى السوشيال ميديا', en: 'Social Content Scheduler' },
    description: {
      ar: 'جهّز منشوراتك لإنستجرام وفيسبوك وباقي المنصات مع صورة وتاريخ نشر، وشوفها في تقويم شهري، وانشرها مباشرة لو ربطت حساب فيسبوك/إنستجرام.',
      en: 'Draft posts for Instagram, Facebook, and more with an image and schedule, view them on a monthly calendar, and publish directly once you connect Facebook/Instagram.'
    },
    cta: { ar: 'جدول منشورك', en: 'Schedule a post' }
  }
];

const COPY = {
  ar: {
    eyebrow: 'لأصحاب المشاريع الصغيرة والبائعين المستقلين',
    heading: 'وصّل لكل عميلك على واتساب برسالة واحدة بس.',
    subheading: 'من غير برمجة. من غير رسوم لكل رسالة.',
    getStarted: 'ابدأ الآن',
    toolsTitle: 'الأدوات',
    toolsSubtitle: 'أربع أدوات بسيطة، كل واحدة بتحل مشكلة حقيقية لأي عمل صغير.',
    formTitle: 'محتاج مساعدة أو عندك سؤال؟',
    formSubtitle: 'اترك بياناتك وهنتواصل معاك في أقرب وقت.',
    name: 'الاسم',
    phone: 'رقم الجوال / واتساب',
    email: 'البريد الإلكتروني (اختياري)',
    message: 'رسالتك (اختياري)',
    send: 'إرسال',
    sending: 'جارٍ الإرسال...',
    success: 'تم الإرسال! هنتواصل معاك قريبًا.',
    error: 'حصل خطأ، حاول تاني.'
  },
  en: {
    eyebrow: 'For small businesses & solo sellers',
    heading: 'Reach every customer on WhatsApp with one simple message.',
    subheading: 'No coding. No per-message fees.',
    getStarted: 'Get started',
    toolsTitle: 'The tools',
    toolsSubtitle: 'Four simple tools, each solving a real problem for a small business.',
    formTitle: 'Need help or have a question?',
    formSubtitle: "Leave your details and we'll get back to you shortly.",
    name: 'Name',
    phone: 'Phone / WhatsApp number',
    email: 'Email (optional)',
    message: 'Your message (optional)',
    send: 'Send',
    sending: 'Sending...',
    success: "Sent! We'll be in touch soon.",
    error: 'Something went wrong, please try again.'
  }
};

export default function Home() {
  const { lang } = useLanguage();
  const t = COPY[lang];

  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');
    try {
      await apiFetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setStatus('success');
      setForm({ name: '', phone: '', email: '', message: '' });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : t.error);
    }
  }

  return (
    <div className="bg-[#f0f0ee]">
      <div className="relative min-h-screen overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
        />

        <div className="relative z-10 flex flex-col min-h-screen">
          <Nav />

          <div className="flex-1 flex items-end pb-10 sm:pb-16 lg:pb-20 px-6 sm:px-12 md:px-20 lg:px-28">
            <div className="max-w-xs">
              <a
                href={TOOL_URL}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-500 hover:text-blue-600 transition-colors mb-3 group"
              >
                {t.eyebrow}
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                  {lang === 'ar' ? '←' : '→'}
                </span>
              </a>

              <h1 className="text-[1.5rem] sm:text-[1.75rem] leading-[1.15] font-medium text-gray-900 tracking-tight mb-3">
                {t.heading}
              </h1>

              <p className="text-[13px] text-gray-400 font-normal mb-3">{t.subheading}</p>

              <a
                href={TOOL_URL}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-blue-500 border border-blue-400 rounded-full px-5 py-2.5 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 group mb-3"
              >
                {t.getStarted}
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                  {lang === 'ar' ? '←' : '→'}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-5 sm:px-10 py-16 sm:py-20">
        <h2 className="text-[1.4rem] sm:text-[1.6rem] font-medium text-gray-900 tracking-tight mb-2">
          {t.toolsTitle}
        </h2>
        <p className="text-[13px] text-gray-400 mb-8 sm:mb-10">{t.toolsSubtitle}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.href}
                className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex flex-col"
              >
                <div
                  className="flex items-center justify-center rounded-full w-11 h-11 mb-4"
                  style={{ backgroundColor: '#EDEDED' }}
                >
                  <Icon size={18} className="text-gray-700" />
                </div>
                <h3 className="text-[15px] font-medium text-gray-900 mb-2">{tool.title[lang]}</h3>
                <p className="text-[12.5px] text-gray-500 leading-relaxed mb-4 flex-1">
                  {tool.description[lang]}
                </p>
                <a
                  href={tool.href}
                  className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-blue-500 border border-blue-400 rounded-full px-4 py-2 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 group"
                >
                  {tool.cta[lang]}
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    {lang === 'ar' ? '←' : '→'}
                  </span>
                </a>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-lg mx-auto px-5 sm:px-10 pb-20 sm:pb-28">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
          <h2 className="text-[1.2rem] font-medium text-gray-900 tracking-tight mb-1.5">{t.formTitle}</h2>
          <p className="text-[12.5px] text-gray-400 mb-6">{t.formSubtitle}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              required
              placeholder={t.name}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[13px] focus:outline-none focus:border-blue-400"
            />
            <input
              type="tel"
              placeholder={t.phone}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[13px] focus:outline-none focus:border-blue-400"
              dir="ltr"
            />
            <input
              type="email"
              placeholder={t.email}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[13px] focus:outline-none focus:border-blue-400"
              dir="ltr"
            />
            <textarea
              placeholder={t.message}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[13px] focus:outline-none focus:border-blue-400 resize-none"
            />

            <button
              type="submit"
              disabled={status === 'sending'}
              className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-white bg-blue-500 rounded-xl px-5 py-3 hover:bg-blue-600 transition-all duration-200 disabled:opacity-60 mt-1"
            >
              {status === 'sending' ? t.sending : t.send}
            </button>

            {status === 'success' && <p className="text-[12.5px] text-green-600 mt-1">{t.success}</p>}
            {status === 'error' && (
              <p className="text-[12.5px] text-red-600 mt-1">{errorMessage || t.error}</p>
            )}
          </form>
        </div>
      </section>

      <WhatsAppFloatButton />
    </div>
  );
}
