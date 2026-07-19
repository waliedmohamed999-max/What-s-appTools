import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Copy,
  Trash2,
  Check,
  Image as ImageIcon,
  Loader2,
  Plus,
  X,
  Pencil,
  Download,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Unlink,
  Send,
  Link2
} from 'lucide-react';
import PageShell from '../components/PageShell';
import BackLink from '../components/BackLink';
import { apiFetch, apiUrl } from '../lib/api';

type Media = { filename: string; originalName: string; mimetype: string } | null;

type Post = {
  id: string;
  platform: string;
  caption: string;
  scheduledAt: string | null;
  media: Media;
  status: 'scheduled' | 'posted';
  createdAt: string;
};

type MetaPage = { id: string; name: string; hasInstagram: boolean };
type MetaStatus = { connected: boolean; configured: boolean; connectedAt?: string; pages?: MetaPage[] };

const PLATFORMS: { key: string; label: string; color: string; dark?: boolean }[] = [
  { key: 'instagram', label: 'Instagram', color: '#E1306C' },
  { key: 'facebook', label: 'Facebook', color: '#1877F2' },
  { key: 'twitter', label: 'X / Twitter', color: '#111827' },
  { key: 'tiktok', label: 'TikTok', color: '#111827' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
  { key: 'snapchat', label: 'Snapchat', color: '#FFFC00', dark: true }
];

const PLATFORM_LIMITS: Record<string, number> = {
  instagram: 2200,
  facebook: 5000,
  twitter: 280,
  tiktok: 2200,
  linkedin: 3000,
  snapchat: 250
};

function platformInfo(key: string) {
  return PLATFORMS.find((p) => p.key === key) || { key, label: key, color: '#6B7280' };
}

function formatDate(iso: string | null) {
  if (!iso) return 'بدون موعد / No schedule';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ContentScheduler() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [existingMedia, setExistingMedia] = useState<Media>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [metaStatus, setMetaStatus] = useState<MetaStatus>({ connected: false, configured: false });
  const [selectedMetaPageId, setSelectedMetaPageId] = useState('');
  const [metaMessage, setMetaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});

  async function loadPosts() {
    setLoadingPosts(true);
    try {
      setPosts(await apiFetch<Post[]>('/api/content/posts'));
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'تعذر تحميل المنشورات / Could not load posts');
    } finally {
      setLoadingPosts(false);
    }
  }

  async function loadMetaStatus() {
    try {
      const status = await apiFetch<MetaStatus>('/api/meta/status');
      setMetaStatus(status);
      setSelectedMetaPageId((current) =>
        status.pages?.some((page) => page.id === current) ? current : status.pages?.[0]?.id || ''
      );
    } catch (err) {
      /* connection panel just stays in its default state */
    }
  }

  useEffect(() => {
    loadPosts();
    loadMetaStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.get('meta_connected')) {
      setMetaMessage({ type: 'success', text: 'تم الاتصال بحساب Meta بنجاح / Meta account connected successfully' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('meta_error')) {
      setMetaMessage({ type: 'error', text: params.get('meta_error') || '' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function disconnectMeta() {
    try {
      await apiFetch('/api/meta/disconnect', { method: 'POST' });
      await loadMetaStatus();
    } catch (err) {
      setMetaMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر قطع الاتصال / Could not disconnect Meta'
      });
    }
  }

  async function publishPost(post: Post) {
    setPublishingId(post.id);
    setPublishErrors((prev) => {
      const next = { ...prev };
      delete next[post.id];
      return next;
    });
    try {
      const pages = metaStatus.pages || [];
      const selectedPage = pages.find((page) => page.id === selectedMetaPageId);
      const publishPage =
        selectedPage && (post.platform !== 'instagram' || selectedPage.hasInstagram)
          ? selectedPage
          : pages.find((page) => post.platform !== 'instagram' || page.hasInstagram);
      if (!publishPage) {
        throw new Error(
          post.platform === 'instagram'
            ? 'اختر صفحة مرتبطة بحساب Instagram / Select a Page linked to Instagram'
            : 'اختر صفحة Meta أولاً / Select a Meta Page first'
        );
      }

      await apiFetch(`/api/content/posts/${post.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: publishPage.id })
      });
      loadPosts();
    } catch (err) {
      setPublishErrors((prev) => ({
        ...prev,
        [post.id]: err instanceof Error ? err.message : 'تعذر الاتصال بالخادم / Cannot reach the server'
      }));
    } finally {
      setPublishingId(null);
    }
  }

  function resetForm() {
    setEditingId(null);
    setSelectedPlatforms(['instagram']);
    setCaption('');
    setScheduledAt('');
    setMediaFile(null);
    setExistingMedia(null);
    setFormError('');
  }

  function startCreate() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(post: Post) {
    setEditingId(post.id);
    setSelectedPlatforms([post.platform]);
    setCaption(post.caption);
    setScheduledAt(post.scheduledAt ? toDatetimeLocal(post.scheduledAt) : '');
    setMediaFile(null);
    setExistingMedia(post.media);
    setFormError('');
    setShowForm(true);
  }

  function togglePlatform(key: string) {
    if (editingId) {
      setSelectedPlatforms([key]);
      return;
    }
    setSelectedPlatforms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (selectedPlatforms.length === 0) {
      setFormError('اختر منصة واحدة على الأقل / Select at least one platform');
      return;
    }
    setSubmitting(true);
    try {
      let uploadedMedia: Media = null;
      if (mediaFile) {
        const formData = new FormData();
        formData.append('media', mediaFile);
        uploadedMedia = await apiFetch<NonNullable<Media>>('/api/media/upload', {
          method: 'POST',
          body: formData
        });
      }

      const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : null;

      if (editingId) {
        const patch: Record<string, unknown> = { platform: selectedPlatforms[0], caption, scheduledAt: scheduledIso };
        if (uploadedMedia) patch.media = uploadedMedia;
        await apiFetch<Post>(`/api/content/posts/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch)
        });
      } else {
        await apiFetch<Post[]>('/api/content/posts/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platforms: selectedPlatforms,
            caption,
            scheduledAt: scheduledIso,
            media: uploadedMedia
          })
        });
      }

      resetForm();
      setShowForm(false);
      await loadPosts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذر الاتصال بالخادم / Cannot reach the server');
    } finally {
      setSubmitting(false);
    }
  }

  async function markPosted(id: string) {
    try {
      await apiFetch(`/api/content/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'posted' })
      });
      await loadPosts();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'تعذر تحديث المنشور / Could not update post');
    }
  }

  async function removePost(id: string) {
    try {
      await apiFetch(`/api/content/posts/${id}`, { method: 'DELETE' });
      await loadPosts();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'تعذر حذف المنشور / Could not delete post');
    }
  }

  async function copyCaption(post: Post) {
    await navigator.clipboard.writeText(post.caption);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId((c) => (c === post.id ? null : c)), 1500);
  }

  const scheduled = posts.filter((p) => p.status === 'scheduled');
  const postedList = posts.filter((p) => p.status === 'posted');

  const now = Date.now();
  const dueSoonCount = scheduled.filter(
    (p) => p.scheduledAt && new Date(p.scheduledAt).getTime() >= now && new Date(p.scheduledAt).getTime() - now <= 7 * 24 * 3600 * 1000
  ).length;
  const overdueCount = scheduled.filter((p) => p.scheduledAt && new Date(p.scheduledAt).getTime() < now).length;

  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    posts.forEach((p) => {
      if (!p.scheduledAt) return;
      const d = new Date(p.scheduledAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [posts]);

  const strictestLimit = selectedPlatforms.length > 0 ? Math.min(...selectedPlatforms.map((p) => PLATFORM_LIMITS[p] ?? 2200)) : null;
  const overLimit = strictestLimit !== null && caption.length > strictestLimit;
  const selectedMetaPage = metaStatus.pages?.find((page) => page.id === selectedMetaPageId);
  const canPublishPost = (post: Post) =>
    Boolean(
      selectedMetaPage &&
        (post.platform === 'facebook' ||
          (post.platform === 'instagram' && post.media && selectedMetaPage.hasInstagram))
    );

  return (
    <PageShell maxWidth="max-w-3xl">
      <BackLink />
      <div className="flex items-start justify-between mb-2 gap-4">
        <div>
          <h1 className="text-[1.5rem] sm:text-[1.75rem] font-medium text-gray-900 tracking-tight mb-2">
            Social Content Scheduler
          </h1>
          <p className="text-[13px] text-gray-400">
            جدولة محتوى السوشيال ميديا / جهّز وجدول منشوراتك، وانسخها للنشر اليدوي وقت الموعد.
          </p>
        </div>
        <button
          onClick={() => (showForm ? setShowForm(false) : startCreate())}
          className="shrink-0 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white bg-blue-500 rounded-xl px-4 py-2.5 hover:bg-blue-600 transition-colors duration-200"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'إغلاق / Close' : 'منشور جديد / New Post'}
        </button>
      </div>

      {loadError && (
        <div className="text-[12.5px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mt-4">
          {loadError}
        </div>
      )}

      {metaMessage && (
        <div
          className={`text-[12.5px] rounded-xl px-4 py-3 mt-4 border ${
            metaMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {metaMessage.text}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-6">
        <h3 className="text-[14px] font-medium text-gray-900 mb-1">الحسابات المتصلة / Connected Accounts</h3>
        <p className="text-[11.5px] text-gray-400 mb-4">
          اربط كل منصة على حدة لتقدر تنشر منها مباشرة بدل النسخ اليدوي.
        </p>

        {metaStatus.connected && (metaStatus.pages?.length || 0) > 0 && (
          <label className="block text-[11.5px] text-gray-500 mb-4">
            صفحة النشر / Publishing Page
            <select
              value={selectedMetaPageId}
              onChange={(event) => setSelectedMetaPageId(event.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2.5 border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-blue-400"
            >
              {metaStatus.pages?.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}{page.hasInstagram ? ' · Instagram' : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PLATFORMS.map((p) => {
            const isMeta = p.key === 'facebook' || p.key === 'instagram';
            const connected =
              p.key === 'facebook'
                ? Boolean(metaStatus.connected && selectedMetaPage)
                : p.key === 'instagram'
                  ? Boolean(metaStatus.connected && selectedMetaPage?.hasInstagram)
                  : false;
            const needsInstagramLink =
              p.key === 'instagram' && Boolean(metaStatus.connected && selectedMetaPage && !selectedMetaPage.hasInstagram);

            return (
              <div key={p.key} className="border border-gray-100 rounded-xl p-4 flex flex-col items-start gap-2">
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: p.color, color: p.dark ? '#111827' : '#fff' }}
                >
                  {p.label}
                </span>

                {!isMeta && <span className="text-[11px] text-gray-400">قريباً / Coming soon</span>}

                {isMeta && connected && (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <Check size={12} /> متصل / Connected
                    </span>
                    <button
                      onClick={disconnectMeta}
                      className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Unlink size={11} /> قطع الاتصال / Disconnect
                    </button>
                  </>
                )}

                {isMeta && needsInstagramLink && (
                  <>
                    <span className="text-[11px] text-amber-600">لا يوجد حساب انستغرام مرتبط بالصفحة / No Instagram linked</span>
                    <a
                      href={apiUrl('/api/meta/auth')}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-500 hover:text-blue-600"
                    >
                      <Link2 size={11} /> إعادة الربط / Reconnect
                    </a>
                  </>
                )}

                {isMeta && !connected && !needsInstagramLink && !metaStatus.configured && (
                  <span className="text-[11px] text-gray-400">لم يتم الإعداد / Not configured</span>
                )}

                {isMeta && !connected && !needsInstagramLink && metaStatus.configured && (
                  <a
                    href={apiUrl('/api/meta/auth')}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white rounded-lg px-3.5 py-2.5 transition-colors"
                    style={{ backgroundColor: p.color }}
                  >
                    <Link2 size={11} /> ربط / Connect
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 mb-2">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 mb-1">مجدولة / Scheduled</p>
          <p className="text-[16px] font-medium text-gray-900">{scheduled.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 mb-1">خلال أسبوع / Due soon</p>
          <p className="text-[16px] font-medium text-gray-900">{dueSoonCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 mb-1">متأخرة / Overdue</p>
          <p className={`text-[16px] font-medium ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueCount}</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 mt-6 mb-8 space-y-4">
          <div>
            <p className="text-[11px] text-gray-400 mb-2">
              {editingId ? 'المنصة / Platform' : 'المنصات (يمكن اختيار أكثر من واحدة) / Platforms (multi-select)'}
            </p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const active = selectedPlatforms.includes(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePlatform(p.key)}
                    className="text-[11.5px] font-medium px-3 py-1.5 rounded-full border transition-all duration-200"
                    style={
                      active
                        ? { backgroundColor: p.color, borderColor: p.color, color: p.dark ? '#111827' : '#fff' }
                        : { borderColor: '#e5e7eb', color: '#6b7280' }
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="اكتب نص المنشور... / Write your caption..."
              className="w-full rounded-xl px-4 py-3 border border-gray-200 text-[16px] sm:text-[13px] focus:outline-none focus:border-blue-400"
              required
            />
            {strictestLimit !== null && (
              <p className={`text-[11px] mt-1 ${overLimit ? 'text-red-600' : 'text-gray-400'}`}>
                {caption.length} / {strictestLimit}
                {overLimit ? ' — النص أطول من الحد المسموح لأحد المنصات المختارة' : ''}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="text-[12px] text-gray-500">
              موعد النشر / Schedule
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1 block rounded-lg px-3 py-3 border border-gray-200 text-[16px] sm:text-[12.5px] text-gray-900 focus:outline-none focus:border-blue-400"
              />
            </label>

            <label className="text-[12px] text-gray-500 inline-flex items-center gap-2 cursor-pointer">
              <span className="inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:border-blue-400 transition-colors">
                <ImageIcon size={14} />
                {mediaFile ? mediaFile.name : existingMedia ? 'استبدال الصورة / Replace image' : 'صورة اختيارية / Optional image'}
              </span>
              <input type="file" accept="image/*" hidden onChange={(e) => setMediaFile(e.target.files?.[0] || null)} />
            </label>

            {existingMedia && !mediaFile && (
              <img
                src={apiUrl(`/uploads/${existingMedia.filename}`)}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-gray-100"
              />
            )}
          </div>

          {formError && (
            <p className="text-[12.5px] text-red-600 flex items-center gap-1.5">
              <AlertCircle size={13} /> {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || overLimit}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-white bg-blue-500 rounded-xl px-6 py-2.5 hover:bg-blue-600 transition-colors duration-200 disabled:opacity-60"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {editingId ? 'حفظ التعديل / Save Changes' : 'حفظ المنشور / Save Post'}
          </button>
        </form>
      )}

      <div className="flex items-center justify-between mt-8 mb-3">
        <div className="inline-flex rounded-xl border border-gray-200 p-0.5">
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium px-3 py-1.5 rounded-lg transition-colors duration-200 ${
              view === 'list' ? 'bg-blue-500 text-white' : 'text-gray-500'
            }`}
          >
            <List size={13} /> قائمة / List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium px-3 py-1.5 rounded-lg transition-colors duration-200 ${
              view === 'calendar' ? 'bg-blue-500 text-white' : 'text-gray-500'
            }`}
          >
            <CalendarDays size={13} /> تقويم / Calendar
          </button>
        </div>
        <a
          href={apiUrl('/api/content/posts/export.xlsx')}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-500 hover:text-blue-600 transition-colors"
        >
          <Download size={12} /> تصدير الجدول / Export
        </a>
      </div>

      {loadingPosts ? (
        <p className="text-[13px] text-gray-400 mt-4">جارٍ التحميل... / Loading...</p>
      ) : view === 'list' ? (
        <div className="space-y-8">
          <PostSection
            title="مجدولة / Scheduled"
            posts={scheduled}
            onMarkPosted={markPosted}
            onDelete={removePost}
            onCopy={copyCaption}
            onEdit={startEdit}
            copiedId={copiedId}
            canPublish={canPublishPost}
            onPublish={publishPost}
            publishingId={publishingId}
            publishErrors={publishErrors}
          />
          <PostSection
            title="تم النشر / Posted"
            posts={postedList}
            onMarkPosted={markPosted}
            onDelete={removePost}
            onCopy={copyCaption}
            onEdit={startEdit}
            copiedId={copiedId}
          />
          {posts.length === 0 && <p className="text-[13px] text-gray-400">لا توجد منشورات بعد / No posts yet</p>}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <CalendarGrid month={calendarMonth} postsByDate={postsByDate} onSelectPost={startEdit} onPrev={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} onNext={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} />
        </div>
      )}
    </PageShell>
  );
}

function PostSection({
  title,
  posts,
  onMarkPosted,
  onDelete,
  onCopy,
  onEdit,
  copiedId,
  canPublish = () => false,
  onPublish,
  publishingId = null,
  publishErrors = {}
}: {
  title: string;
  posts: Post[];
  onMarkPosted: (id: string) => void;
  onDelete: (id: string) => void;
  onCopy: (post: Post) => void;
  onEdit: (post: Post) => void;
  copiedId: string | null;
  canPublish?: (post: Post) => boolean;
  onPublish?: (post: Post) => void;
  publishingId?: string | null;
  publishErrors?: Record<string, string>;
}) {
  if (posts.length === 0) return null;

  const now = Date.now();

  return (
    <div>
      <h3 className="text-[12.5px] font-medium text-gray-500 mb-3">{title}</h3>
      <div className="space-y-3">
        {posts.map((post) => {
          const info = platformInfo(post.platform);
          const overdue = post.status === 'scheduled' && post.scheduledAt && new Date(post.scheduledAt).getTime() < now;
          const publishable = canPublish(post);
          return (
            <div key={post.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex gap-4">
              {post.media && (
                <img
                  src={apiUrl(`/uploads/${post.media.filename}`)}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-100"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className="text-[10.5px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: info.color, color: info.dark ? '#111827' : '#fff' }}
                  >
                    {info.label}
                  </span>
                  <span className="text-[11.5px] text-gray-400">{formatDate(post.scheduledAt)}</span>
                  {overdue && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-red-600">
                      <AlertCircle size={11} /> متأخر / Overdue
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] text-gray-700 whitespace-pre-wrap break-words">{post.caption}</p>
                {publishable && (
                  <button
                    onClick={() => onPublish?.(post)}
                    disabled={publishingId === post.id}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-500 hover:text-blue-600 transition-colors mt-2 disabled:opacity-60"
                  >
                    {publishingId === post.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    نشر الآن / Publish Now
                  </button>
                )}
                {publishErrors[post.id] && (
                  <p className="text-[11px] text-red-600 mt-1.5 flex items-start gap-1">
                    <AlertCircle size={11} className="mt-0.5 shrink-0" /> {publishErrors[post.id]}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => onEdit(post)}
                  title="تعديل / Edit"
                  className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-blue-500 hover:border-blue-300 transition-colors duration-200"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onCopy(post)}
                  title="نسخ النص / Copy caption"
                  className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-blue-500 hover:border-blue-300 transition-colors duration-200"
                >
                  {copiedId === post.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
                {post.status === 'scheduled' && (
                  <button
                    onClick={() => onMarkPosted(post.id)}
                    title="تم النشر / Mark as posted"
                    className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-300 transition-colors duration-200"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  onClick={() => onDelete(post.id)}
                  title="حذف / Delete"
                  className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors duration-200"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarGrid({
  month,
  postsByDate,
  onSelectPost,
  onPrev,
  onNext
}: {
  month: Date;
  postsByDate: Map<string, Post[]>;
  onSelectPost: (post: Post) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-blue-500 hover:border-blue-300 transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="text-[13px] font-medium text-gray-800">{monthLabel}</span>
        <button onClick={onNext} className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-blue-500 hover:border-blue-300 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdayLabels.map((w) => (
          <div key={w} className="text-[10px] text-gray-400 text-center py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />;
          const key = `${year}-${m}-${d}`;
          const dayPosts = postsByDate.get(key) || [];
          const isToday = today.getFullYear() === year && today.getMonth() === m && today.getDate() === d;
          return (
            <div
              key={i}
              className={`aspect-square rounded-lg border p-1 overflow-hidden ${isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-100'}`}
            >
              <div className="text-[10px] text-gray-400 mb-0.5">{d}</div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((p) => {
                  const info = platformInfo(p.platform);
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelectPost(p)}
                      className="w-full text-[9px] text-left truncate rounded px-1 py-0.5"
                      style={{ backgroundColor: info.color, color: info.dark ? '#111827' : '#fff' }}
                      title={p.caption}
                    >
                      {p.caption.slice(0, 12)}
                    </button>
                  );
                })}
                {dayPosts.length > 3 && <div className="text-[9px] text-gray-400">+{dayPosts.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
