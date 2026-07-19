import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, error } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#f0f0ee]" dir="rtl">
        <div className="max-w-md w-full rounded-2xl bg-white border border-red-100 p-6 text-center">
          <div className="inline-flex rounded-xl bg-gray-900 text-white font-bold tracking-widest px-4 py-3 mb-4">
            DMS
          </div>
          <p className="text-[13px] text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-blue-500 text-white text-[13px] px-4 py-3"
          >
            إعادة المحاولة / Retry
          </button>
        </div>
      </main>
    );
  }
  if (!user) {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  return <>{children}</>;
}
