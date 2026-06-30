import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';
import { ProtectAdminPage } from '@/components/ProtectAdminPage';
import { apiClient } from '@/lib/api-client';

type InquiryStatus = 'unread' | 'read' | 'replied';

interface Inquiry {
  id: number;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  senderType?: string;
  subject: string;
  message: string;
  projectType?: string | null;
  status: InquiryStatus;
  adminReply?: string | null;
  createdAt: string;
  updatedAt?: string;
}

const normalizeInstallerMessage = (message: string) =>
  message
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

const parseInstallerDetails = (message: string) => {
  if (!message) return null;
  const lines = normalizeInstallerMessage(message)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const getLine = (prefix: string) =>
    lines.find((l) => l.toLowerCase().startsWith(prefix.toLowerCase()));
  const readValue = (prefix: string) => getLine(prefix)?.split(':').slice(1).join(':').trim();
  const installerId = readValue('Installer ID:') || readValue('Installer Id:') || readValue('InstallerID:');
  const installerName = readValue('Installer:') || readValue('Installer Name:');
  const installerEmail = readValue('Installer Email:') || readValue('Installer Email Address:');
  const installerPhone = readValue('Installer Phone:') || readValue('Installer Phone Number:');
  if (!installerId && !installerName && !installerEmail && !installerPhone) return null;
  return { installerId, installerName, installerEmail, installerPhone };
};

const parseInstallerNameFromSubject = (subject: string) => {
  const value = String(subject || '');
  const parts = value.split('|').map((part) => part.trim());
  if (parts.length < 2) return '';
  return parts[1];
};

const stripInstallerHeader = (message: string) => {
  if (!message) return '';
  const normalized = normalizeInstallerMessage(message);
  const marker = '\n\nMessage:\n';
  const idx = normalized.indexOf(marker);
  if (idx >= 0) {
    return normalized.substring(idx + marker.length).trim();
  }
  return normalized;
};

const isInstallerInquiry = (inquiry: Inquiry) => {
  const subject = String(inquiry.subject || '').toLowerCase();
  const projectType = String(inquiry.projectType || '').toLowerCase();
  return subject.includes('installer inquiry') || subject.includes('installer') || projectType.length > 0;
};

export default function AdminInstallerInquiriesPage() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const installerDetails = useMemo(
    () => (selected ? parseInstallerDetails(selected.message) : null),
    [selected]
  );
  const installerNameFromSubject = useMemo(
    () => (selected ? parseInstallerNameFromSubject(selected.subject) : ''),
    [selected]
  );

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/messages/admin/all');
      const payload = Array.isArray(response.data) ? response.data : [];
      setInquiries(payload.filter(isInstallerInquiry));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch installer inquiries');
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const counters = useMemo(() => {
    const unread = inquiries.filter((i) => i.status === 'unread').length;
    const replied = inquiries.filter((i) => i.status === 'replied').length;
    return { total: inquiries.length, unread, replied };
  }, [inquiries]);

  const handleOpen = (inquiry: Inquiry) => {
    setSelected(inquiry);
    setReply(inquiry.adminReply || '');
  };

  const handleMarkRead = async (id: number) => {
    try {
      setSavingId(id);
      await apiClient.patch(`/messages/inquiries/${id}/read`);
      setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'read' } : i)));
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status: 'read' } : prev));
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to mark inquiry as read');
    } finally {
      setSavingId(null);
    }
  };

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    try {
      setSavingId(selected.id);
      const response = await apiClient.post(`/messages/inquiries/${selected.id}/reply`, {
        message: reply.trim(),
      });
      const updated = response.data as Inquiry;
      setSelected(updated);
      setInquiries((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      alert('Reply sent successfully');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send reply');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const ok = confirm('Delete this installer request? This cannot be undone.');
    if (!ok) return;
    try {
      setSavingId(selected.id);
      await apiClient.delete(`/messages/inquiries/${selected.id}`);
      setInquiries((prev) => prev.filter((i) => i.id !== selected.id));
      setSelected(null);
      setReply('');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete request');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ProtectAdminPage requiredRole="admin">
      <Head>
        <title>Installer Requests - Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Installer Requests</h1>
          <p className="text-gray-700 mt-1 font-semibold">
            Customer requests sent from installer profile pages (contact details saved).
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3 max-w-xl">
            <div className="bg-white border rounded-lg p-3">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold">{counters.total}</p>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <p className="text-xs text-gray-500">Unread</p>
              <p className="text-xl font-bold text-orange-600">{counters.unread}</p>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <p className="text-xs text-gray-500">Replied</p>
              <p className="text-xl font-bold text-emerald-600">{counters.replied}</p>
            </div>
          </div>

          {error && <div className="mt-4 p-3 rounded bg-red-100 text-red-700 border border-red-200">{error}</div>}

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
            <section className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <p className="font-bold text-gray-900">Request List</p>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {loading && <p className="p-4 text-gray-600">Loading inquiries...</p>}
                {!loading && inquiries.length === 0 && <p className="p-4 text-gray-600">No installer inquiries found.</p>}
                {!loading &&
                  inquiries.map((inquiry) => (
                    <button
                      key={inquiry.id}
                      onClick={() => handleOpen(inquiry)}
                      className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${
                        selected?.id === inquiry.id ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 truncate">{inquiry.senderName}</p>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            inquiry.status === 'unread'
                              ? 'bg-slate-900 text-white'
                              : inquiry.status === 'replied'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {inquiry.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{inquiry.senderEmail}</p>
                      <p className="text-sm mt-1 text-gray-700 truncate">{inquiry.subject}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{new Date(inquiry.createdAt).toLocaleString()}</p>
                    </button>
                  ))}
              </div>
            </section>

            <section className="bg-white border rounded-xl p-4">
              {!selected ? (
                <p className="text-gray-600">Select an inquiry to view details and reply.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.subject}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      From {selected.senderName} ({selected.senderEmail}){selected.senderPhone ? ` | ${selected.senderPhone}` : ''}
                    </p>
                    {(installerDetails || installerNameFromSubject) && (
                      <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                        <p className="font-semibold">Requested Installer</p>
                        {installerDetails?.installerName || installerNameFromSubject ? (
                          <p>{installerDetails?.installerName || installerNameFromSubject}</p>
                        ) : null}
                        {installerDetails?.installerEmail ? (
                          <p className="text-xs">{installerDetails?.installerEmail}</p>
                        ) : null}
                        {installerDetails?.installerPhone ? (
                          <p className="text-xs">{installerDetails?.installerPhone}</p>
                        ) : null}
                        {installerDetails?.installerId ? (
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-[11px] text-blue-700">ID: {installerDetails?.installerId}</p>
                            <a
                              href={`/installer/${installerDetails?.installerId}`}
                              className="text-[11px] text-blue-700 underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Profile
                            </a>
                          </div>
                        ) : (
                          <p className="text-[11px] text-blue-700 mt-1">Installer profile link unavailable for older inquiries.</p>
                        )}
                      </div>
                    )}
                    {!installerDetails && !installerNameFromSubject && selected.subject.toLowerCase().includes('installer') && (
                      <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Installer details were not captured for this inquiry. Newer requests include the installer profile details automatically.
                      </div>
                    )}
                    {selected.projectType && (
                      <p className="text-sm text-blue-700 mt-1 font-semibold">Project Type: {selected.projectType}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 border rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Message</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{stripInstallerHeader(selected.message)}</p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleMarkRead(selected.id)}
                      disabled={savingId === selected.id || selected.status !== 'unread'}
                      className="px-3 py-2 rounded-lg border font-semibold disabled:opacity-50"
                    >
                      Mark as Read
                    </button>
                    <a
                      href="https://wa.me/2349022298109"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg border font-semibold text-green-700 border-green-200 bg-green-50"
                    >
                      WhatsApp Support
                    </a>
                    <button
                      onClick={fetchInquiries}
                      className="px-3 py-2 rounded-lg border font-semibold"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={savingId === selected.id}
                      className="px-3 py-2 rounded-lg border font-semibold text-red-600 border-red-200 bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Admin Reply</label>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={6}
                      className="w-full border rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                      placeholder="Type your response..."
                    />
                    <button
                      onClick={handleReply}
                      disabled={savingId === selected.id || !reply.trim()}
                      className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50"
                    >
                      {savingId === selected.id ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </ProtectAdminPage>
  );
}
