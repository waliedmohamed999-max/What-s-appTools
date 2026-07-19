import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackLink() {
  return (
    <Link
      to="/products"
      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-200 mb-6"
    >
      <ArrowLeft size={14} />
      Products
    </Link>
  );
}
