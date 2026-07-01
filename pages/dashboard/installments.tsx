import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api-client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuthStore } from '@/store/authStore';

interface Cheque {
  id: string;
  chequeId: string;
  issueDate: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  clearedDate?: string;
  adminNotes?: string;
}

interface Installment {
  id: string;
  referenceNumber: string;
  paymentPlan: '3-month' | '6-month';
  totalAmount: number;
  monthlyAmount: number;
  paidAmount: number;
  remainingBalance: number;
  status: 'pending' | 'partially_cleared' | 'fully_cleared' | 'cancelled';
  cheques: Cheque[];
  createdAt: string;
  order?: {
    id: string;
    totalPrice: number;
  };
}

export default function InstallmentsDashboard() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand hydration before checking auth
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    
    if (!token) {
      router.push('/login');
    } else {
      fetchInstallments();
    }
  }, [token, router, isHydrated]);

  const fetchInstallments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `${process.env.NEXT_PUBLIC_API_URL}/installments/user/all`
      );
      setInstallments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch installments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_cleared':
        return 'bg-green-100 text-green-800';
      case 'partially_cleared':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-900 font-bold';
    }
  };

  const getChequeStatusColor = (status: string) => {
    switch (status) {
      case 'cleared':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'bounced':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-black font-bold border-gray-200';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Installments</h1>
          <p className="text-black font-bold">Track your cheque payments and installment plans</p>
        </div>

        {!isHydrated || loading ? (
          <div className="text-center py-12">
            <p className="text-black font-bold">Loading your installments...</p>
          </div>
        ) : installments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-black font-bold mb-4">You don't have any active installment plans yet.</p>
            <button
              onClick={() => router.push('/products')}
              className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Shop Products
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {installments.map((installment) => (
              <div key={installment.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Main Summary */}
                <div
                  onClick={() => setExpandedId(expandedId === installment.id ? null : installment.id)}
                  className="p-6 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-xs text-black font-semibold uppercase tracking-wide">Reference</p>
                      <p className="text-lg font-semibold text-gray-900">{installment.referenceNumber}</p>
                    </div>

                    <div>
                      <p className="text-xs text-black font-semibold uppercase tracking-wide">Plan</p>
                      <p className="text-lg font-semibold text-gray-900">{installment.paymentPlan}</p>
                      <p className="text-xs text-black font-bold mt-1">
                        {installment.cheques.length} cheques
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-black font-semibold uppercase tracking-wide">Total Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ₦{installment.totalAmount.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-black font-semibold uppercase tracking-wide">Progress</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${(installment.paidAmount / installment.totalAmount) * 100}%`
                          }}
                        />
                      </div>
                      <p className="text-xs text-black font-bold mt-1">
                        ₦{installment.paidAmount.toLocaleString()} / ₦{installment.totalAmount.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(installment.status)}`}>
                        {installment.status === 'fully_cleared' ? 'Fully Paid' :
                         installment.status === 'partially_cleared' ? 'Partially Paid' :
                         installment.status === 'pending' ? 'Pending' :
                         'Cancelled'}
                      </span>
                      <span className="text-black font-bold font-semibold">
                        {expandedId === installment.id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === installment.id && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <div>
                        <p className="text-sm text-black font-bold">Monthly Amount</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ₦{installment.monthlyAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-black font-bold">Paid Amount</p>
                        <p className="text-2xl font-bold text-green-600">
                          ₦{installment.paidAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-black font-bold">Remaining Balance</p>
                        <p className="text-2xl font-bold text-orange-600">
                          ₦{installment.remainingBalance.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Cheques Table */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Cheque Details</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-400">
                              <th className="text-left py-3 px-4 text-black font-bold font-medium">Cheque ID</th>
                              <th className="text-left py-3 px-4 text-black font-bold font-medium">Issue Date</th>
                              <th className="text-left py-3 px-4 text-black font-bold font-medium">Amount</th>
                              <th className="text-left py-3 px-4 text-black font-bold font-medium">Bank</th>
                              <th className="text-left py-3 px-4 text-black font-bold font-medium">Status</th>
                              <th className="text-left py-3 px-4 text-black font-bold font-medium">Cleared Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {installment.cheques.map((cheque) => (
                              <tr
                                key={cheque.id}
                                className={`border-b border-gray-200 ${getChequeStatusColor(cheque.status)}`}
                              >
                                <td className="py-3 px-4 font-semibold">{cheque.chequeId}</td>
                                <td className="py-3 px-4">
                                  {new Date(cheque.issueDate).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4 font-semibold">
                                  ₦{cheque.amount.toLocaleString()}
                                </td>
                                <td className="py-3 px-4">{cheque.bankName}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    cheque.status === 'cleared' ? 'bg-green-100 text-green-800' :
                                    cheque.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    cheque.status === 'bounced' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-900 font-bold'
                                  }`}>
                                    {cheque.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {cheque.clearedDate
                                    ? new Date(cheque.clearedDate).toLocaleDateString()
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Admin Notes */}
                      {installment.cheques.some(c => c.adminNotes) && (
                        <div className="mt-4 p-4 bg-white border border-gray-400 rounded-lg">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Admin Notes:</p>
                          {installment.cheques.map(c => c.adminNotes && (
                            <p key={c.id} className="text-sm text-black font-bold">
                              <span className="font-medium">{c.chequeId}:</span> {c.adminNotes}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                      {installment.status !== 'cancelled' && (
                        <button
                          onClick={() => router.push(`/installments/${installment.id}/download`)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Download Receipt
                        </button>
                      )}
                      {installment.remainingBalance > 0 && installment.status !== 'cancelled' && (
                        <button
                          onClick={() => router.push('/installment-cheque-form')}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          Submit More Cheques
                        </button>
                      )}
                      {installment.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel this installment?')) {
                              apiClient.post(
                                `${process.env.NEXT_PUBLIC_API_URL}/installments/${installment.id}/cancel`,
                                {}
                              ).then(() => fetchInstallments());
                            }
                          }}
                          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          Cancel Plan
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}



