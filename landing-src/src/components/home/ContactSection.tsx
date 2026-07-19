import { useState, type FormEvent } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { apiFetch } from '../../lib/api';

const COPY = {
  ar: {
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

export default function ContactSection() {
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
          {status === 'error' && <p className="text-[12.5px] text-red-600 mt-1">{errorMessage || t.error}</p>}
        </form>
      </div>
    </section>
  );
}
