import { FormEvent, useEffect, useState } from 'react';
import Header from "@/components/layout/Header";
import { apiClient } from '@/lib/api-client';

type Dispute = {
  id: string;
  orderNumber?: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  resolutionSummary?: string;
  createdAt: string;
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDisputes = async () => {
    try {
      const response = await apiClient.get('/disputes/my');
      setDisputes(response.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load disputes');
    }
  };

  useEffect(() => {
    void loadDisputes();
  }, []);

  const createDispute = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await apiClient.post('/disputes', {
        orderId: orderId || undefined,
        subject,
        description,
        priority,
      });
      setSubject('');
      setDescription('');
      setOrderId('');
      setPriority('medium');
      setMessage('Dispute submitted. Admin will review it.');
      await loadDisputes();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit dispute');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Dispute Center</h1>
        {message && <div className="mb-3 p-3 rounded bg-green-50 border border-green-200 text-green-800">{message}</div>}
        {error && <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-800">{error}</div>}

        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={createDispute} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="font-bold text-gray-900">Open New Dispute</p>
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="Order ID (optional)" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="Describe the issue clearly" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required />
            <select className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button className="w-full bg-slate-900 text-white rounded py-2 font-bold hover:bg-slate-950">Submit Dispute</button>
          </form>

          <div className="space-y-3">
            {disputes.length === 0 && <div className="bg-white border border-gray-200 rounded-xl p-4 text-gray-700">No disputes yet.</div>}
            {disputes.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between gap-2">
                  <p className="font-bold text-gray-900">{item.subject}</p>
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">{item.status}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">Priority: {item.priority}</p>
                {item.orderNumber && <p className="text-sm text-gray-700">Order: {item.orderNumber}</p>}
                <p className="text-gray-800 mt-2">{item.description}</p>
                {item.resolutionSummary && <p className="mt-2 text-sm text-emerald-700 font-semibold">Resolution: {item.resolutionSummary}</p>}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

