import { useState, type FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageShell from '../components/PageShell';
import { safeNextPath } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      if (/\.html(?:[?#]|$)/i.test(nextPath)) {
        window.location.assign(nextPath);
      } else {
        navigate(nextPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ / Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell maxWidth="max-w-sm">
      <h1 className="text-[1.5rem] font-medium text-gray-900 tracking-tight mb-2 mt-4">تسجيل الدخول / Login</h1>
      <p className="text-[13px] text-gray-400 mb-6">سجّل دخولك عشان تربط حساباتك وتستخدم أدوات المحتوى.</p>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <label className="block text-[12px] text-gray-500">
          البريد الإلكتروني / Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg px-3 py-3 border border-gray-200 text-[16px] focus:outline-none focus:border-blue-400"
          />
        </label>
        <label className="block text-[12px] text-gray-500">
          كلمة المرور / Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg px-3 py-3 border border-gray-200 text-[16px] focus:outline-none focus:border-blue-400"
          />
        </label>

        {error && <p className="text-[12px] text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-medium text-white bg-blue-500 rounded-xl px-4 py-3 hover:bg-blue-600 transition-colors duration-200 disabled:opacity-60"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          دخول / Login
        </button>
      </form>

      <p className="text-[12px] text-gray-400 mt-4">
        ما عندكش حساب؟{' '}
        <Link to={`/register?next=${encodeURIComponent(nextPath)}`} className="text-blue-500 hover:text-blue-600">
          أنشئ حساب / Register
        </Link>
      </p>
    </PageShell>
  );
}
