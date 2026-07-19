import type { ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4';

const TOOL_URL = '/app.html';

const COPY = {
  ar: {
    eyebrow: 'لأصحاب المشاريع الصغيرة والبائعين المستقلين',
    heading: 'وصّل لكل عميلك على واتساب برسالة واحدة بس.',
    subheading: 'من غير برمجة. من غير رسوم لكل رسالة.',
    getStarted: 'ابدأ الآن',
    trust: ['بدون تثبيت', 'عربي وإنجليزي', 'خصوصية كاملة — بياناتك عندك']
  },
  en: {
    eyebrow: 'For small businesses & solo sellers',
    heading: 'Reach every customer on WhatsApp with one simple message.',
    subheading: 'No coding. No per-message fees.',
    getStarted: 'Get started',
    trust: ['Nothing to install', 'Arabic & English', 'Fully private — your data stays yours']
  }
};

export default function Hero({ children }: { children?: ReactNode }) {
  const { lang } = useLanguage();
  const t = COPY[lang];
  const arrow = lang === 'ar' ? '←' : '→';

  return (
    <div className="relative min-h-screen overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {children}

        <div className="flex-1 flex items-end pb-10 sm:pb-16 lg:pb-20 px-6 sm:px-12 md:px-20 lg:px-28">
          <div className="max-w-sm">
            <a
              href={TOOL_URL}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-500 hover:text-blue-600 transition-colors mb-3 group"
            >
              {t.eyebrow}
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                {arrow}
              </span>
            </a>

            <h1 className="text-[1.5rem] sm:text-[1.75rem] leading-[1.15] font-medium text-gray-900 tracking-tight mb-3">
              {t.heading}
            </h1>

            <p className="text-[13px] text-gray-400 font-normal mb-3">{t.subheading}</p>

            <a
              href={TOOL_URL}
              className="inline-flex items-center gap-2 text-[13px] font-medium text-blue-500 border border-blue-400 rounded-full px-5 py-2.5 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 group mb-4"
            >
              {t.getStarted}
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">{arrow}</span>
            </a>

            <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
              {t.trust.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
                  <span className="inline-block w-1 h-1 rounded-full bg-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
