'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { uploadImageToS3 } from '@/lib/s3ImageUploader';

type AdBanner = {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  linkUrl?: string | null;
  redirectUrl?: string | null;
  type?: 'flash_deal' | 'product' | 'swap_resale' | null;
  ctaText?: string | null;
  durationSeconds?: number | null;
  displayOrder: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
  createdAt?: string;
};

export default function AdvertBannersAdmin() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [bannerType, setBannerType] = useState<'flash_deal' | 'product' | 'swap_resale' | ''>('');
  const [ctaText, setCtaText] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    const normalizedRole = String(user?.role || '').toLowerCase();
    const normalizedAccountType = String((user as any)?.accountType || '').toLowerCase();
    const adminLevel = String((user as any)?.adminLevel || '').toUpperCase();
    const isAdminLike =
      normalizedRole === 'admin' ||
      normalizedAccountType === 'admin' ||
      adminLevel.startsWith('SA');

    if (!user || !isAdminLike) {
      router.push('/login');
      return;
    }

    fetchBanners();
  }, [isHydrated, user, router]);

  const fetchBanners = async () => {
    try {
      setListLoading(true);
      const response = await apiClient.get('/ad-banners');
      const payload = response.data?.data ?? response.data ?? [];
      setBanners(Array.isArray(payload) ? payload : []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch ad banners:', err);
      setError('Failed to fetch ad banners');
    } finally {
      setListLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setLinkUrl('');
    setRedirectUrl('');
    setBannerType('');
    setCtaText('');
    setDurationSeconds('');
    setDisplayOrder('0');
    setIsActive(true);
    setStartAt('');
    setEndAt('');
    setFile(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    try {
      let mediaType: 'image' | 'video' | undefined;
      let s3Url: string | undefined;
      if (file) {
        mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        s3Url = await uploadImageToS3(file, 'ad-banners');
      }

      const payload: any = {
        title: title.trim(),
        linkUrl: linkUrl.trim() || undefined,
        redirectUrl: redirectUrl.trim() || undefined,
        type: bannerType || undefined,
        ctaText: ctaText.trim() || undefined,
        durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
        displayOrder: Number(displayOrder || 0),
        isActive,
        startAt: startAt || undefined,
        endAt: endAt || undefined,
      };

      if (editingId) {
        if (s3Url && mediaType) {
          payload.mediaUrl = s3Url;
          payload.mediaType = mediaType;
        }
        await apiClient.put(`/ad-banners/${editingId}`, payload);
        setSuccess('Advert banner updated');
      } else {
        if (!s3Url || !mediaType) {
          setError('Please select an image or video');
          setLoading(false);
          return;
        }
        payload.mediaUrl = s3Url;
        payload.mediaType = mediaType;
        await apiClient.post('/ad-banners', payload);
        setSuccess('Advert banner created');
      }
      resetForm();
      fetchBanners();
    } catch (err: any) {
      console.error('Failed to create ad banner:', err);
      setError(err?.response?.data?.message || 'Failed to save ad banner');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this advert banner?')) return;
    try {
      setLoading(true);
      await apiClient.delete(`/ad-banners/${id}`);
      setSuccess('Advert banner deleted');
      setBanners((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      console.error('Failed to delete ad banner:', err);
      setError('Failed to delete ad banner');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (banner: AdBanner) => {
    try {
      setLoading(true);
      await apiClient.put(`/ad-banners/${banner.id}`, { isActive: !banner.isActive });
      setBanners((prev) =>
        prev.map((item) => (item.id === banner.id ? { ...item, isActive: !item.isActive } : item))
      );
    } catch (err: any) {
      console.error('Failed to update ad banner:', err);
      setError('Failed to update ad banner');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (banner: AdBanner) => {
    setEditingId(banner.id);
    setTitle(banner.title || '');
    setLinkUrl(banner.linkUrl || '');
    setRedirectUrl(banner.redirectUrl || '');
    setBannerType((banner.type as any) || '');
    setCtaText(banner.ctaText || '');
    setDurationSeconds(banner.durationSeconds ? String(banner.durationSeconds) : '');
    setDisplayOrder(String(banner.displayOrder ?? 0));
    setIsActive(Boolean(banner.isActive));
    setStartAt(banner.startAt ? banner.startAt.slice(0, 16) : '');
    setEndAt(banner.endAt ? banner.endAt.slice(0, 16) : '');
    setFile(null);
    setSuccess('');
    setError('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Advert Banners</h1>
        <button
          type="button"
          onClick={() => router.push('/admin-dashboard')}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
        >
          Back to Dashboard
        </button>
      </div>

      {error && <div style={{ background: '#ff6b6b', color: 'white', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>✗ {error}</div>}
      {success && <div style={{ background: '#51cf66', color: 'white', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>✓ {success}</div>}

      <form onSubmit={handleCreate} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Advert' : 'Create New Advert'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
            required
          />
          <select
            value={bannerType}
            onChange={(e) => {
              const value = e.target.value as any;
              setBannerType(value);
              if (!redirectUrl) {
                if (value === 'flash_deal') setRedirectUrl('/flash-deals');
                if (value === 'product') setRedirectUrl('/products');
                if (value === 'swap_resale') setRedirectUrl('/swap-resale');
              }
            }}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
          >
            <option value="">Select type</option>
            <option value="flash_deal">Flash Deal</option>
            <option value="product">Product</option>
            <option value="swap_resale">Swap & Resale</option>
          </select>
          <input
            type="text"
            placeholder="Link URL (optional)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
          />
          <input
            type="text"
            placeholder="Redirect URL (optional)"
            value={redirectUrl}
            onChange={(e) => setRedirectUrl(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
          />
          <input
            type="text"
            placeholder="CTA text (optional)"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
          />
          <input
            type="number"
            placeholder="Duration seconds (optional)"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
            min={1}
          />
          <input
            type="number"
            placeholder="Display order"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
            min={0}
          />
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
          />
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {editingId && (
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
              Leave file empty to keep the current media.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            style={{ background: '#16a34a', color: 'white', padding: '10px 18px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
          >
            {loading ? 'Saving...' : editingId ? 'Update Advert' : 'Create Advert'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              style={{ background: '#e2e8f0', color: '#0f172a', padding: '10px 18px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div>
        <h3 style={{ marginBottom: '10px' }}>Adverts ({banners.length})</h3>
        {listLoading ? (
          <div>Loading adverts...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {banners.map((banner) => (
              <div key={banner.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#fff' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>{banner.title}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{banner.mediaType.toUpperCase()}</div>
                {banner.type && <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600, marginBottom: '6px' }}>Type: {banner.type}</div>}
                {banner.redirectUrl && <div style={{ fontSize: '12px', color: '#2563eb', marginBottom: '6px' }}>Redirect: {banner.redirectUrl}</div>}
                {banner.mediaType === 'image' ? (
                  <img src={banner.mediaUrl} alt={banner.title} style={{ width: '100%', height: '180px', objectFit: 'contain', borderRadius: '8px', background: '#f8fafc' }} />
                ) : (
                  <video src={banner.mediaUrl} style={{ width: '100%', height: '180px', objectFit: 'contain', borderRadius: '8px', background: '#f8fafc' }} muted />
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => startEdit(banner)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5f5', background: '#e0e7ff', color: '#3730a3', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(banner)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: banner.isActive ? '#fde68a' : '#dcfce7', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {banner.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(banner.id)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
