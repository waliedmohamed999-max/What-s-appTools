import { useLanguage } from '../../context/LanguageContext';

const STEPS = [
  {
    ar: { title: 'اختار الأداة المناسبة', body: 'إرسال واتساب، تحليل متجر، ميزانية حملة، أو جدولة محتوى.' },
    en: { title: 'Pick the right tool', body: 'WhatsApp sending, store analysis, campaign budget, or content scheduling.' }
  },
  {
    ar: { title: 'جهّز بياناتك', body: 'ملف Excel بالأرقام، رابط متجرك، أو رقم الميزانية — كله بسيط.' },
    en: { title: 'Bring your data', body: 'An Excel file of numbers, your store URL, or a budget figure — that simple.' }
  },
  {
    ar: { title: 'نفّذ واستلم النتيجة فورًا', body: 'من غير انتظار، ومن غير خطوات تقنية معقدة.' },
    en: { title: 'Run it, get results instantly', body: 'No waiting around, no complicated technical steps.' }
  }
];

const COPY = {
  ar: { title: 'إزاي تشتغل', subtitle: 'ثلاث خطوات بسيطة من أي أداة لحد النتيجة.' },
  en: { title: 'How it works', subtitle: 'Three simple steps from any tool to a result.' }
};

export default function HowItWorks() {
  const { lang } = useLanguage();
  const t = COPY[lang];

  return (
    <section className="bg-white border-y border-black/5">
      <div className="max-w-5xl mx-auto px-5 sm:px-10 py-16 sm:py-20">
        <h2 className="text-[1.4rem] sm:text-[1.6rem] font-medium text-gray-900 tracking-tight mb-2">{t.title}</h2>
        <p className="text-[13px] text-gray-400 mb-8 sm:mb-10">{t.subtitle}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          {STEPS.map((step, index) => (
            <div key={step.en.title} className="relative">
              <div className="text-[2rem] font-medium text-gray-100 leading-none mb-2 tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="text-[14px] font-medium text-gray-900 mb-1.5">{step[lang].title}</h3>
              <p className="text-[12.5px] text-gray-400 leading-relaxed">{step[lang].body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
