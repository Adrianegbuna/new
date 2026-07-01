import { useEffect, useState } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import { ProtectAdminPage } from '@/components/services-requests/ProtectAdminPage';
import { apiClient } from '@/lib/api-client';

interface Installer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  certifications?: string;
  yearsOfExperience?: string | number;
  serviceAreas?: string;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected' | string;
  createdAt?: string;
}

type FilterType = 'pending' | 'approved';

export default function AdminInstallerVerificationPage() {
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [notesByInstaller, setNotesByInstaller] = useState<Record<string, string>>({});

  const fetchInstallers = async () => {
    setLoading(true);
    try {
      const endpoint = filter === 'pending' ? '/admin/installers/pending' : '/admin/installers';
      const response = await apiClient.get(endpoint);
      const payload = response.data?.data ?? response.data ?? [];
      setInstallers(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to fetch installers:', error);
      setInstallers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstallers();
  }, [filter]);

  const handleApproval = async (installerId: string, status: 'approved' | 'rejected') => {
    setProcessingId(installerId);
    try {
      await apiClient.post(`/admin/installers/${installerId}/verify`, {
        status,
        notes: notesByInstaller[installerId] || '',
      });
      await fetchInstallers();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to update installer verification');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredInstallers = installers.filter((installer) =>
    filter === 'pending'
      ? String(installer.verificationStatus || 'pending') === 'pending'
      : String(installer.verificationStatus || '') === 'approved'
  );

  return (
    <ProtectAdminPage requiredRole="admin">
      <Head>
        <title>Installer Verification - Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Installer Verification</h1>
              <p className="text-gray-700 font-semibold">Approve or reject installer accounts</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg font-bold ${
                  filter === 'pending' ? 'bg-slate-900 text-white' : 'bg-white text-gray-800'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-lg font-bold ${
                  filter === 'approved' ? 'bg-green-600 text-white' : 'bg-white text-gray-800'
                }`}
              >
                Approved
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl p-6 shadow text-gray-900 font-semibold">Loading installers...</div>
          ) : filteredInstallers.length === 0 ? (
            <div className="bg-white rounded-xl p-6 shadow text-gray-900 font-semibold">
              No {filter} installers found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInstallers.map((installer) => (
                <div key={installer.id} className="bg-white rounded-xl shadow p-5">
                  <h3 className="text-xl font-bold text-gray-900">
                    {installer.firstName} {installer.lastName}
                  </h3>
                  <p className="text-gray-700 font-semibold">{installer.email}</p>
                  <p className="text-gray-700 font-semibold">{installer.phone || 'No phone'}</p>
                  <p className="text-sm text-gray-700 font-semibold mt-2">
                    {installer.city || 'N/A'}, {installer.country || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-700 font-semibold">
                    Experience: {installer.yearsOfExperience || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-700 font-semibold">Certifications: {installer.certifications || 'N/A'}</p>
                  {String(installer.verificationStatus || 'pending') !== 'approved' && (
                    <>
                      <textarea
                        value={notesByInstaller[installer.id] || ''}
                        onChange={(e) =>
                          setNotesByInstaller((prev) => ({ ...prev, [installer.id]: e.target.value }))
                        }
                        placeholder="Optional review notes"
                        className="w-full mt-3 p-3 border rounded-lg font-semibold text-gray-900"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleApproval(installer.id, 'approved')}
                          disabled={processingId === installer.id}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(installer.id, 'rejected')}
                          disabled={processingId === installer.id}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectAdminPage>
  );
}


