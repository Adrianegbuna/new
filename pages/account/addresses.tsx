import { FormEvent, useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import { apiClient } from '@/lib/api-client';

type Address = {
  id: string;
  label?: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isDefault: boolean;
};

const emptyAddress = {
  label: '',
  recipientName: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  country: 'Nigeria',
  postalCode: '',
  isDefault: false,
};

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(emptyAddress);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAddresses = async () => {
    try {
      const response = await apiClient.get('/addresses');
      setAddresses(response.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load addresses');
    }
  };

  useEffect(() => {
    void loadAddresses();
  }, []);

  const createAddress = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await apiClient.post('/addresses', form);
      setForm(emptyAddress);
      setMessage('Address saved.');
      await loadAddresses();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const makeDefault = async (id: string) => {
    setError('');
    try {
      await apiClient.patch(`/addresses/${id}/default`);
      await loadAddresses();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to set default');
    }
  };

  const removeAddress = async (id: string) => {
    setError('');
    try {
      await apiClient.delete(`/addresses/${id}`);
      await loadAddresses();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to remove address');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Saved Addresses</h1>
        {message && <div className="mb-3 p-3 rounded bg-green-50 border border-green-200 text-green-800">{message}</div>}
        {error && <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-800">{error}</div>}

        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={createAddress} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="font-bold text-gray-900">Add Address</p>
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="Label (Home, Office)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="Recipient name" value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} required />
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="Street address" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} required />
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="Postal code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            <label className="flex items-center gap-2 text-gray-900 font-semibold">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              Set as default
            </label>
            <button disabled={loading} type="submit" className="w-full bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700 disabled:bg-gray-400">
              {loading ? 'Saving...' : 'Save Address'}
            </button>
          </form>

          <div className="space-y-3">
            {addresses.length === 0 && <div className="bg-white border border-gray-200 rounded-xl p-4 text-gray-700">No saved addresses yet.</div>}
            {addresses.map((address) => (
              <div key={address.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-bold text-gray-900">
                    {address.label || 'Address'} {address.isDefault && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Default</span>}
                  </p>
                  <div className="flex gap-2">
                    {!address.isDefault && <button onClick={() => makeDefault(address.id)} className="text-sm text-blue-700 font-semibold">Make default</button>}
                    <button onClick={() => removeAddress(address.id)} className="text-sm text-red-700 font-semibold">Delete</button>
                  </div>
                </div>
                <p className="text-gray-900 mt-2">{address.recipientName}</p>
                <p className="text-gray-700">{address.phone}</p>
                <p className="text-gray-700">{address.street}</p>
                <p className="text-gray-700">{address.city}{address.state ? `, ${address.state}` : ''}</p>
                <p className="text-gray-700">{address.country || ''}{address.postalCode ? ` - ${address.postalCode}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

