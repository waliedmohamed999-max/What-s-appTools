import { useLanguage } from '../../context/LanguageContext';
import WhatsAppIcon from '../icons/WhatsAppIcon';

const MESSAGES = {
  ar: [
    { from: 'them', text: 'مرحبًا! 👋' },
    { from: 'me', text: 'أهلاً بيك، عندنا عرض اليوم خصم 20% 🎉' },
    { from: 'them', text: 'تمام، عايز أطلب!' },
    { from: 'me', text: 'تمام، هبعتلك رابط الدفع الآن' }
  ],
  en: [
    { from: 'them', text: 'Hi there! 👋' },
    { from: 'me', text: "Hey! We've got 20% off today 🎉" },
    { from: 'them', text: "I'd like to order!" },
    { from: 'me', text: 'Sending you the checkout link now' }
  ]
};

const CONTACT_NAME = { ar: 'متجرك', en: 'Your Store' };
const TYPING_LABEL = { ar: 'جارٍ الكتابة...', en: 'typing...' };

export default function GlassPhoneMockup() {
  const { lang } = useLanguage();
  const messages = MESSAGES[lang];

  return (
    <div className="glass-panel rounded-[1.75rem] p-4 sm:p-5 w-[280px] sm:w-[320px] shadow-[0_24px_60px_-20px_rgba(20,20,26,0.35)]">
      <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-white/40">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[#25d366] text-white shrink-0">
          <WhatsAppIcon size={16} />
          <span className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{CONTACT_NAME[lang]}</p>
          <p className="text-[10.5px] text-[var(--text-muted)]">{TYPING_LABEL[lang]}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {messages.map((m, i) => {
          const isMe = m.from === 'me';
          const isLast = i === messages.length - 1;
          return (
            <div
              key={i}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              style={{
                opacity: 0,
                animation: 'fade-up 0.5s ease-out both',
                animationDelay: `${0.4 + i * 0.7}s`
              }}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
                  isMe ? 'bg-[#dcf8c6] text-[#111]' : 'bg-white text-[#111]'
                }`}
              >
                {m.text}
                {isMe && (
                  <span
                    className="inline-flex ms-1.5 text-[10px] text-[#53bdeb]"
                    style={{
                      opacity: 0,
                      animation: isLast ? 'check-in 0.3s ease-out both' : 'check-in 0.3s ease-out both',
                      animationDelay: `${0.4 + i * 0.7 + 0.5}s`
                    }}
                  >
                    ✓✓
                  </span>
                )}
              </div>
            </div>
          );
        })}

        <div
          className="flex justify-start"
          style={{ opacity: 0, animation: 'fade-up 0.5s ease-out both', animationDelay: `${0.4 + messages.length * 0.7}s` }}
        >
          <div className="flex items-center gap-1 bg-white rounded-2xl px-3 py-2.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]"
                style={{ animation: 'typing-dot 1.2s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
