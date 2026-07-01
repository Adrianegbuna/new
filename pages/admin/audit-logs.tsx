import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import { apiClient } from '@/lib/api-client';

type AuditLog = {
  id: string;
  action: string;
  targetType?: string;
  targetId?: string;
  statusCode?: number;
  ipAddress?: string;
  createdAt: string;
  actor?: { firstName?: string; lastName?: string; email?: string };
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get('/admin/audit-logs?limit=200');
        setLogs(response.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load audit logs');
      }
    };
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Audit Logs</h1>
        {error && <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-800">{error}</div>}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-bold text-gray-700 border-b bg-gray-50">
            <div className="col-span-3">When</div>
            <div className="col-span-2">Actor</div>
            <div className="col-span-4">Action</div>
            <div className="col-span-2">Target</div>
            <div className="col-span-1">Code</div>
          </div>
          {logs.map((log) => (
            <div key={log.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b last:border-b-0">
              <div className="col-span-3 text-gray-900">{new Date(log.createdAt).toLocaleString()}</div>
              <div className="col-span-2 text-gray-800">{log.actor?.email || `${log.actor?.firstName || ''} ${log.actor?.lastName || ''}`.trim() || 'Admin'}</div>
              <div className="col-span-4 text-gray-900">{log.action}</div>
              <div className="col-span-2 text-gray-700">{log.targetType || '-'} {log.targetId ? `(${log.targetId})` : ''}</div>
              <div className="col-span-1 text-gray-700">{log.statusCode || '-'}</div>
            </div>
          ))}
          {logs.length === 0 && <div className="p-6 text-gray-700">No audit logs yet.</div>}
        </div>
      </main>
    </div>
  );
}

