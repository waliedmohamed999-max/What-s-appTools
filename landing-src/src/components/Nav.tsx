import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'Story', href: '#' },
  { label: 'Products', href: '/products' },
  { label: 'Help', href: '#' },
  { label: 'Support', href: '#' }
];

export default function Nav({ sticky = false }: { sticky?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <nav
      className={
        sticky
          ? 'sticky top-0 z-20 flex items-center justify-center py-3 sm:py-4 px-4 sm:px-8 gap-2 sm:gap-3 backdrop-blur-md bg-[#f0f0ee]/90 border-b border-black/5'
          : 'flex items-center justify-center pt-4 sm:pt-6 px-4 sm:px-8 gap-2 sm:gap-3'
      }
    >
      <Link
        to="/"
        className="flex items-center justify-center rounded-full w-11 h-11 shrink-0"
        style={{ backgroundColor: '#EDEDED' }}
      >
        <Logo />
      </Link>

      {/* Story/Help/Support are non-functional placeholders — hidden on mobile so the bar
          doesn't overflow; Products is the one link that actually goes somewhere, so it
          gets its own always-visible pill instead of living inside the hidden group. */}
      <Link
        to="/products"
        className="sm:hidden inline-flex items-center text-[13px] font-medium text-gray-700 rounded-xl px-4 py-3 shrink-0"
        style={{ backgroundColor: '#EDEDED' }}
      >
        Products
      </Link>

      <div
        className="hidden sm:flex items-center gap-6 md:gap-10 rounded-xl px-6 md:px-8 py-3"
        style={{ backgroundColor: '#EDEDED' }}
      >
        {NAV_LINKS.map((link) =>
          link.href.startsWith('/') ? (
            <Link
              key={link.label}
              to={link.href}
              className="text-[14px] font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
            >
              {link.label}
            </Link>
          ) : (
            <a
              key={link.label}
              href={link.href}
              className="text-[14px] font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
            >
              {link.label}
            </a>
          )
        )}
      </div>

      <a
        href="/app.html"
        className="inline-flex items-center text-[13px] sm:text-[14px] font-medium text-blue-500 border border-blue-400 rounded-xl px-4 py-3 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 shrink-0"
      >
        <span className="sm:hidden">Tool</span>
        <span className="hidden sm:inline">Open Tool</span>
      </a>

      {user ? (
        <button
          onClick={handleLogout}
          title={user.email}
          className="inline-flex items-center gap-1.5 text-[13px] sm:text-[14px] font-medium text-gray-500 hover:text-red-600 rounded-xl px-3 py-3 transition-colors duration-200 shrink-0"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline max-w-[120px] truncate">{user.email}</span>
        </button>
      ) : (
        <Link
          to="/login"
          className="inline-flex items-center text-[13px] sm:text-[14px] font-medium text-gray-700 hover:text-gray-900 rounded-xl px-3 py-3 transition-colors duration-200 shrink-0"
        >
          Login
        </Link>
      )}
    </nav>
  );
}
