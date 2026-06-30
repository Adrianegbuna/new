import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';
import { ProtectAdminPage } from '@/components/ProtectAdminPage';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/router';

type RequestStatus = 'pending' | 'approved' | 'assigned' | 'in_progress' | 'completed' | 'rejected';

interface ServiceRequestItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  serviceType: string;
  message: string;
  status: RequestStatus;
  assignedTo?: string | null;
  isPaid?: boolean;
  paymentReference?: string | null;
  amount?: number;
  source?: 'request' | 'payment';
  createdAt: string;
  updatedAt?: string;
  assignedUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  updates?: Array<{
    id: string;
    oldStatus?: string | null;
    newStatus?: string;
    note?: string | null;
    createdAt?: string;
  }>;
}

interface InstallerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isVerified?: boolean;
}

export default function AdminServiceRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<ServiceRequestItem[]>([]);
  const [installers, setInstallers] = useState<InstallerOption[]>([]);
  const [selected, setSelected] = useState<ServiceRequestItem | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [selectedInstallerId, setSelectedInstallerId] = useState('');
  const isUuid = (value?: string | null) =>
    Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [requestsRes, fallbackRes, installersRes, paymentsRes] = await Promise.allSettled([
        apiClient.get('/admin/service-requests'),
        apiClient.get('/service-requests/admin/all'),
        apiClient.get('/admin/installers'),
        apiClient.get('/admin/payments')
      ]);

      if (requestsRes.status === 'rejected' && fallbackRes.status === 'rejected') {
        const primaryError = (requestsRes.reason as any)?.response?.data?.message || (requestsRes.reason as any)?.message;
        const fallbackError = (fallbackRes.reason as any)?.response?.data?.message || (fallbackRes.reason as any)?.message;
        setError(primaryError || fallbackError || 'Failed to fetch service requests');
      }

      const primaryPayload = requestsRes.status === 'fulfilled' ? (requestsRes.value.data?.data ?? requestsRes.value.data) : [];
      const fallbackPayload = fallbackRes.status === 'fulfilled' ? (fallbackRes.value.data?.data ?? fallbackRes.value.data) : [];
      const primaryList = Array.isArray(primaryPayload) ? primaryPayload : Array.isArray(primaryPayload?.data) ? primaryPayload.data : [];
      const fallbackList = Array.isArray(fallbackPayload) ? fallbackPayload : Array.isArray(fallbackPayload?.data) ? fallbackPayload.data : [];
      const requestList = [...primaryList, ...fallbackList].filter((item, index, arr) =>
        item?.id ? arr.findIndex((entry) => entry?.id === item.id) === index : index === arr.findIndex((entry) => entry === item)
      );

      const installerPayload = installersRes.status === 'fulfilled'
        ? (installersRes.value.data?.data ?? installersRes.value.data)
        : [];
      const installerList = Array.isArray(installerPayload) ? installerPayload : Array.isArray(installerPayload?.data) ? installerPayload.data : [];

      const paymentsPayload = paymentsRes.status === 'fulfilled'
        ? (paymentsRes.value.data?.data ?? paymentsRes.value.data)
        : [];
      const paymentsList = Array.isArray(paymentsPayload) ? paymentsPayload : Array.isArray(paymentsPayload?.data) ? paymentsPayload.data : [];
      const servicePayments = paymentsList.filter((p: any) => String(p?.paymentCategory || p?.paymentType || '').toLowerCase() === 'service');

      const existingRefs = new Set(
        requestList
          .map((req: any) => getPaymentRef(String(req?.message || '')))
          .filter(Boolean)
      );
      const existingServiceIds = new Set(
        requestList
          .map((req: any) => String(req?.id || ''))
          .filter(Boolean)
      );

      const derivedFromPayments: ServiceRequestItem[] = servicePayments
        .filter((p: any) => {
          const ref = String(p?.reference || '').trim();
          if (!ref) return false;
          if (existingRefs.has(ref)) return false;
          const serviceRequestId = String(p?.serviceRequestId || '').trim();
          if (serviceRequestId && existingServiceIds.has(serviceRequestId)) return false;
          return true;
        })
        .map((p: any) => {
          const paymentRef = String(p?.reference || '').trim();
          const amount = Number(p?.amount || 0);
          const customer = p?.customer || {};
          return {
            id: p?.serviceRequestId || `payment-${paymentRef}`,
            fullName:
              customer?.fullName ||
              `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
              customer?.email ||
              'Service customer',
            email: customer?.email || 'N/A',
            phone: customer?.phone || 'N/A',
            serviceType: 'Service Payment',
            message: [
              'Service payment received.',
              paymentRef ? `Payment Reference: ${paymentRef}` : '',
              amount ? `Amount: ₦${amount.toLocaleString()}` : ''
            ].filter(Boolean).join('\n'),
            status: 'pending',
            isPaid: true,
            paymentReference: paymentRef || null,
            amount: amount || 0,
            source: 'payment',
            createdAt: p?.transactionDate || p?.createdAt || new Date().toISOString(),
            updatedAt: p?.transactionDate || p?.createdAt || new Date().toISOString()
          } as ServiceRequestItem;
        });

      const normalizedRequests: ServiceRequestItem[] = requestList.map((req: ServiceRequestItem) => ({
        ...req,
        isPaid: Boolean(req.isPaid || /payment reference/i.test(String(req.message || ''))),
        paymentReference: getPaymentRef(String(req.message || '')) || req.paymentReference || null,
        source: 'request' as const
      }));

      const mergedRequests = [...normalizedRequests].sort((a, b) =>
        new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
      );

      setRequests(mergedRequests);
      setInstallers(installerList);

      const selectedId = typeof router.query.selected === 'string' ? router.query.selected : '';
      if (selectedId) {
        const match = normalizedRequests.find((r: ServiceRequestItem) => r.id === selectedId) || null;
        setSelected(match);
      } else if (!selected && normalizedRequests.length > 0) {
        setSelected(normalizedRequests[0]);
      } else if (selected) {
        const refreshed = normalizedRequests.find((r: ServiceRequestItem) => r.id === selected.id) || null;
        setSelected(refreshed);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch service requests');
      setRequests([]);
      setInstallers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router.query.selected]);

  useEffect(() => {
    if (selected?.assignedTo) {
      setSelectedInstallerId(selected.assignedTo);
    } else {
      setSelectedInstallerId('');
    }
  }, [selected?.id, selected?.assignedTo]);

  const counters = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length;
    const assigned = requests.filter((r) => r.status === 'assigned' || r.status === 'in_progress').length;
    const completed = requests.filter((r) => r.status === 'completed').length;
    return { total: requests.length, pending, assigned, completed };
  }, [requests]);

  const getPaymentRef = (message: string) => {
    if (!message) return '';
    const match = message.match(/payment reference:\s*(.+)/i);
    if (!match?.[1]) return '';
    return match[1].split('\n')[0].trim();
  };

  const latestUpdate = (req?: ServiceRequestItem | null) => {
    if (!req?.updates || req.updates.length === 0) return null;
    return [...req.updates].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
  };

  const updateStatus = async (status: RequestStatus) => {
    if (!selected) return;
    if (selected.source === 'payment' || !isUuid(selected.id)) {
      alert('This entry came from a payment only. Ask the customer to submit the service request so you can manage it.');
      return;
    }
    try {
      setSaving(true);
      await apiClient.patch(`/service-requests/admin/${selected.id}/status`, {
        status,
        note: statusNote.trim() || undefined
      });
      setStatusNote('');
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update request status');
    } finally {
      setSaving(false);
    }
  };

  const assignInstaller = async () => {
    if (!selected || !selectedInstallerId) return;
    if (selected.source === 'payment' || !isUuid(selected.id)) {
      alert('This entry came from a payment only. Ask the customer to submit the service request so you can assign it.');
      return;
    }
    try {
      setSaving(true);
      await apiClient.patch(`/service-requests/admin/${selected.id}/assign`, {
        assignToUserId: selectedInstallerId
      });
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to assign installer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectAdminPage requiredRole="admin">
      <Head>
        <title>Service Requests - Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-gray-700 font-semibold mt-1">
            Review customer service requests, payment status, and completion acknowledgements.
          </p>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
            <div className="bg-white border rounded-lg p-3"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold">{counters.total}</p></div>
            <div className="bg-white border rounded-lg p-3"><p className="text-xs text-gray-500">Pending</p><p className="text-xl font-bold text-amber-600">{counters.pending}</p></div>
            <div className="bg-white border rounded-lg p-3"><p className="text-xs text-gray-500">Assigned</p><p className="text-xl font-bold text-blue-600">{counters.assigned}</p></div>
            <div className="bg-white border rounded-lg p-3"><p className="text-xs text-gray-500">Completed</p><p className="text-xl font-bold text-emerald-600">{counters.completed}</p></div>
          </div>

          {error && <div className="mt-4 p-3 rounded bg-red-100 text-red-700 border border-red-200">{error}</div>}

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
            <section className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <p className="font-bold text-gray-900">Requests</p>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {loading && <p className="p-4 text-gray-600">Loading requests...</p>}
                {!loading && requests.length === 0 && <p className="p-4 text-gray-600">No service requests found.</p>}
                {!loading && requests.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => setSelected(req)}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${selected?.id === req.id ? 'bg-blue-50' : 'bg-white'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 truncate">{req.fullName}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{req.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{req.email}</p>
                    <p className="text-sm mt-1 text-gray-700 truncate">{req.serviceType}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{new Date(req.createdAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white border rounded-xl p-4">
              {!selected ? (
                <p className="text-gray-600">Select a request to view details.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.serviceType}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {selected.fullName} ({selected.email}) • {selected.phone}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${selected.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        Payment: {selected.isPaid ? 'PAID' : 'UNPAID'}
                      </span>
                      {(selected.paymentReference || getPaymentRef(selected.message)) && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          Ref: {selected.paymentReference || getPaymentRef(selected.message)}
                        </span>
                      )}
                      {selected.amount ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          Amount: ₦{Number(selected.amount || 0).toLocaleString()}
                        </span>
                      ) : null}
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                        Status: {selected.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {selected.source === 'payment' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                          Payment Only
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 border rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Request Message</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{selected.message}</p>
                  </div>

                  {latestUpdate(selected)?.note && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <p className="text-xs text-emerald-700 font-semibold mb-1">Latest Status Note</p>
                      <p className="text-emerald-900 whitespace-pre-wrap">{latestUpdate(selected)?.note}</p>
                      {latestUpdate(selected)?.createdAt && (
                        <p className="text-[11px] text-emerald-700 mt-1">
                          {new Date(latestUpdate(selected)?.createdAt as string).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Assign Installer</label>
                      <select
                        value={selectedInstallerId}
                        onChange={(e) => setSelectedInstallerId(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">Select installer</option>
                        {installers.map((installer) => (
                          <option key={installer.id} value={installer.id}>
                            {`${installer.firstName || ''} ${installer.lastName || ''}`.trim() || installer.email} {installer.isVerified ? '(Verified)' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={assignInstaller}
                        disabled={saving || !selectedInstallerId}
                        className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Assign Installer'}
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">Status Note (optional)</label>
                      <textarea
                        rows={3}
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="Add context for this status update"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => updateStatus('approved')} disabled={saving} className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-50">Mark Approved</button>
                    <button onClick={() => updateStatus('in_progress')} disabled={saving} className="px-3 py-2 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-50">Mark In Progress</button>
                    <button onClick={() => updateStatus('completed')} disabled={saving} className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50">Mark Completed</button>
                    <button onClick={() => updateStatus('rejected')} disabled={saving} className="px-3 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50">Reject</button>
                    <button onClick={fetchData} disabled={saving} className="px-3 py-2 rounded-lg border font-semibold disabled:opacity-50">Refresh</button>
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
