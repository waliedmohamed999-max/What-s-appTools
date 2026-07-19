import { useLanguage } from '../context/LanguageContext';
import WhatsAppIcon from './icons/WhatsAppIcon';

const WHATSAPP_NUMBER = '966509095816';

export default function WhatsAppFloatButton() {
  const { lang } = useLanguage();
  const label = lang === 'ar' ? 'تواصل معنا عبر واتساب' : 'Chat with us on WhatsApp';

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200"
    >
      <WhatsAppIcon size={28} />
    </a>
  );
}
