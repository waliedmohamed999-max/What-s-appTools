import { useState, type FormEvent } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
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
    error: 'حصل خطأ، حاول تاني.',
    invalidEmail: 'صيغة البريد الإلكتروني غير صحيحة',
    needContact: 'محتاج رقم جوال أو بريد إلكتروني على الأقل'
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
    error: 'Something went wrong, please try again.',
    invalidEmail: 'That email address looks invalid',
    needContact: 'Add a phone number or email so we can reach you'
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fieldClass(state: 'idle' | 'valid' | 'invalid') {
  const base =
    'w-full rounded-xl border px-4 py-3 text-[13px] transition-colors duration-200 focus-glow bg-[var(--bg)]';
  if (state === 'valid') return `${base} border-emerald-300`;
  if (state === 'invalid') return `${base} border-red-300`;
  return `${base} border-[var(--line)]`;
}

export default function ContactSection() {
  const { lang } = useLanguage();
  const t = COPY[lang];

  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [touched, setTouched] = useState({ name: false, email: false });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const nameValid = form.name.trim().length > 0;
  const emailValid = form.email.trim() === '' || EMAIL_RE.test(form.email.trim());
  const hasContact = form.phone.trim() !== '' || form.email.trim() !== '';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true });
    if (!nameValid || !emailValid) return;

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
      setTouched({ name: false, email: false });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : t.error);
    }
  }

  return (
    <section className="max-w-lg mx-auto px-5 sm:px-10 pb-20 sm:pb-28">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-8">
        <h2 className="text-[1.2rem] font-bold text-[var(--text-primary)] tracking-tight mb-1.5">{t.formTitle}</h2>
        <p className="text-[12.5px] text-[var(--text-secondary)] mb-6">{t.formSubtitle}</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <div>
            <input
              type="text"
              placeholder={t.name}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={() => setTouched((tt) => ({ ...tt, name: true }))}
              className={fieldClass(touched.name ? (nameValid ? 'valid' : 'invalid') : 'idle')}
            />
            {touched.name && !nameValid && (
              <p className="flex items-center gap-1 text-[11.5px] text-red-500 mt-1.5">
                <AlertCircle size={12} /> {t.name}
              </p>
            )}
          </div>

          <input
            type="tel"
            placeholder={t.phone}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={fieldClass('idle')}
            dir="ltr"
          />

          <div>
            <input
              type="email"
              placeholder={t.email}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              onBlur={() => setTouched((tt) => ({ ...tt, email: true }))}
              className={fieldClass(
                touched.email && form.email ? (emailValid ? 'valid' : 'invalid') : 'idle'
              )}
              dir="ltr"
            />
            {touched.email && form.email && !emailValid && (
              <p className="flex items-center gap-1 text-[11.5px] text-red-500 mt-1.5">
                <AlertCircle size={12} /> {t.invalidEmail}
              </p>
            )}
          </div>

          <textarea
            placeholder={t.message}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            rows={3}
            className={`${fieldClass('idle')} resize-none`}
          />

          {touched.name && nameValid && !hasContact && (
            <p className="flex items-center gap-1 text-[11.5px] text-[var(--text-muted)]">
              <AlertCircle size={12} /> {t.needContact}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-white bg-[var(--primary)] rounded-xl px-5 py-3 hover:bg-[var(--primary-hover)] transition-all duration-200 disabled:opacity-60 mt-1"
          >
            {status === 'sending' ? t.sending : t.send}
          </button>

          {status === 'success' && (
            <p className="flex items-center gap-1.5 text-[12.5px] text-emerald-600 mt-1">
              <CheckCircle2 size={14} /> {t.success}
            </p>
          )}
          {status === 'error' && (
            <p className="flex items-center gap-1.5 text-[12.5px] text-red-600 mt-1">
              <AlertCircle size={14} /> {errorMessage || t.error}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
