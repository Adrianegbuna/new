import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api-client';
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuthStore } from '@/store/authStore';

interface Cheque {
  chequeId: string;
  issueDate: string;
  amount: number;
  bankName: string;
  accountNumber: string;
}

interface FormData {
  orderId: string;
  paymentPlan: '3-month' | '6-month';
  totalAmount: number;
  monthlyAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  cheques: Cheque[];
}

export default function InstallmentChequeForm() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<'3-month' | '6-month'>('3-month');
  const [totalAmount, setTotalAmount] = useState(0);
  const [cheques, setCheques] = useState<Cheque[]>([
    { chequeId: '', issueDate: '', amount: 0, bankName: '', accountNumber: '' }
  ]);

  // Wait for Zustand hydration before checking auth
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    
    if (!token) {
      router.push('/login');
    }
  }, [token, router, isHydrated]);

  const monthlyAmount = totalAmount > 0 ? Math.ceil(totalAmount / (paymentPlan === '3-month' ? 3 : 6)) : 0;
  const numberOfCheques = paymentPlan === '3-month' ? 3 : 6;

  useEffect(() => {
    // Initialize cheques array based on payment plan
    const newCheques = Array(numberOfCheques).fill(null).map((_, index) => ({
      chequeId: `CHQ-${index + 1}`,
      issueDate: '',
      amount: monthlyAmount,
      bankName: '',
      accountNumber: ''
    }));
    setCheques(newCheques);
  }, [paymentPlan, monthlyAmount, numberOfCheques]);

  const handleChequeChange = (index: number, field: string, value: any) => {
    const updated = [...cheques];
    updated[index] = { ...updated[index], [field]: value };
    setCheques(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!totalAmount || totalAmount <= 0) {
        setError('Total amount must be greater than 0');
        setLoading(false);
        return;
      }

      const invalidCheques = cheques.some(
        c => !c.chequeId || !c.issueDate || !c.bankName || !c.accountNumber
      );

      if (invalidCheques) {
        setError('Please fill all cheque details');
        setLoading(false);
        return;
      }

      const { orderId } = router.query;

      const response = await apiClient.post(
        `${process.env.NEXT_PUBLIC_API_URL}/installments/create`,
        {
          orderId: orderId || user?.id,
          paymentPlan,
          totalAmount,
          monthlyAmount,
          customerName: user ? `${user.firstName} ${user.lastName}` : '',
          customerEmail: user?.email || '',
          customerPhone: user?.phone || '',
          cheques
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuccess('Installment plan created successfully! Cheques submitted for clearing.');
      setTimeout(() => {
        router.push('/dashboard/installments');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create installment plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Installment Cheque Payment</h1>
          <p className="text-gray-900 font-bold mb-8">
            Submit your cheques for the installment payment plan. Please ensure all cheque details are accurate.
          </p>

          {!isHydrated && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              Loading your information...
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-8">
            {/* Payment Plan Selection */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Payment Plan</h2>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer"
                  style={{ borderColor: paymentPlan === '3-month' ? '#10b981' : '#e5e7eb' }}>
                  <input
                    type="radio"
                    value="3-month"
                    checked={paymentPlan === '3-month'}
                    onChange={(e) => setPaymentPlan(e.target.value as '3-month' | '6-month')}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="ml-3">
                    <span className="font-semibold text-gray-900">3-Month Plan</span>
                    <span className="block text-sm text-gray-900 font-bold">3 cheques</span>
                  </span>
                </label>

                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer"
                  style={{ borderColor: paymentPlan === '6-month' ? '#10b981' : '#e5e7eb' }}>
                  <input
                    type="radio"
                    value="6-month"
                    checked={paymentPlan === '6-month'}
                    onChange={(e) => setPaymentPlan(e.target.value as '3-month' | '6-month')}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="ml-3">
                    <span className="font-semibold text-gray-900">6-Month Plan</span>
                    <span className="block text-sm text-gray-900 font-bold">6 cheques</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Amount Section */}
            <div className="mb-8 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Total Amount (?)</label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g. 250,000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Monthly Amount (?)</label>
                <input
                  type="text"
                  value={monthlyAmount.toLocaleString()}
                  disabled
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg bg-gray-50 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Number of Cheques</label>
                <input
                  type="text"
                  value={numberOfCheques}
                  disabled
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg bg-gray-50 text-black"
                />
              </div>
            </div>

            {/* Cheques Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Cheque Details</h2>
              <div className="space-y-4">
                {cheques.map((cheque, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-4">Cheque {index + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Cheque ID</label>
                        <input
                          type="text"
                          value={cheque.chequeId}
                          onChange={(e) => handleChequeChange(index, 'chequeId', e.target.value)}
                          placeholder={`CHQ-${index + 1}`}
                          className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Issue Date</label>
                        <input
                          type="date"
                          value={cheque.issueDate}
                          onChange={(e) => handleChequeChange(index, 'issueDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Amount (?)</label>
                        <input
                          type="number"
                          value={cheque.amount}
                          onChange={(e) => handleChequeChange(index, 'amount', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={cheque.bankName}
                          onChange={(e) => handleChequeChange(index, 'bankName', e.target.value)}
                          placeholder="e.g., First Bank"
                          className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-900 mb-1">Account Number</label>
                        <input
                          type="text"
                          value={cheque.accountNumber}
                          onChange={(e) => handleChequeChange(index, 'accountNumber', e.target.value)}
                          placeholder="Account number on cheque"
                          className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Submitting...' : 'Submit Cheques for Clearing'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}




