import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageShell from '../components/PageShell';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(email, password);
      navigate('/content-scheduler');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ / Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell maxWidth="max-w-sm">
      <h1 className="text-[1.5rem] font-medium text-gray-900 tracking-tight mb-2 mt-4">إنشاء حساب / Register</h1>
      <p className="text-[13px] text-gray-400 mb-6">حساب واحد يخليك تربط منصاتك وتشوف بياناتك بس، خاصة بيك.</p>

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
          كلمة المرور (8 أحرف على الأقل) / Password (min 8 characters)
          <input
            type="password"
            required
            minLength={8}
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
          إنشاء حساب / Register
        </button>
      </form>

      <p className="text-[12px] text-gray-400 mt-4">
        عندك حساب بالفعل؟{' '}
        <Link to="/login" className="text-blue-500 hover:text-blue-600">
          سجّل دخول / Login
        </Link>
      </p>
    </PageShell>
  );
}
