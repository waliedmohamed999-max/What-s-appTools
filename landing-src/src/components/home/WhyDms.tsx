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
      en: 'Every tool is a simple interface — upload a file, paste a link, or fill in a number, that\'s it.'
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
      en: "No need to subscribe to scattered tools — everything you need is right here."
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
      en: "No login screens, and your data is never sold or shared with third parties."
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
  en: { title: 'Why DMS', subtitle: 'Built to actually serve small businesses, not to sell you features you don\'t need.' }
};

export default function WhyDms() {
  const { lang } = useLanguage();
  const t = COPY[lang];

  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-10 py-16 sm:py-20">
      <h2 className="text-[1.4rem] sm:text-[1.6rem] font-medium text-gray-900 tracking-tight mb-2">{t.title}</h2>
      <p className="text-[13px] text-gray-400 mb-8 sm:mb-10 max-w-md">{t.subtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title.en} className="p-5 sm:p-6 rounded-2xl bg-white border border-gray-200">
              <div
                className="flex items-center justify-center rounded-full w-10 h-10 mb-4"
                style={{ backgroundColor: '#EDEDED' }}
              >
                <Icon size={17} className="text-gray-700" />
              </div>
              <h3 className="text-[14px] font-medium text-gray-900 mb-1.5">{feature.title[lang]}</h3>
              <p className="text-[12.5px] text-gray-400 leading-relaxed">{feature.body[lang]}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
