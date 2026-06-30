'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';

interface ServiceRequestFormData {
  fullName: string;
  email: string;
  phone: string;
  serviceType: string;
  message: string;
}

export const ServiceRequestForm: React.FC = () => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState<ServiceRequestFormData>({
    fullName: user?.firstName + ' ' + user?.lastName || '',
    email: user?.email || '',
    phone: '',
    serviceType: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    console.log('[SERVICE_REQUEST_FORM] Submitting service request:', formData);

    try {
      // Validate form data
      if (!formData.fullName || !formData.email || !formData.phone || !formData.serviceType || !formData.message) {
        setError('All fields are required');
        setLoading(false);
        return;
      }

      if (formData.message.length < 10) {
        setError('Message must be at least 10 characters');
        setLoading(false);
        return;
      }

      // Submit service request
      const response = await apiClient.post('/service-requests', {
        ...formData,
        role: user?.role || 'customer',
      });

      console.log('[SERVICE_REQUEST_FORM] Response:', response.data);

      if (response.data.success) {
        setSuccess(true);
        setFormData({
          fullName: user?.firstName + ' ' + user?.lastName || '',
          email: user?.email || '',
          phone: '',
          serviceType: '',
          message: '',
        });

        // Show success message for 5 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        setError(response.data.message || 'Failed to submit service request');
      }
    } catch (err: any) {
      console.error('[SERVICE_REQUEST_FORM] Error:', err);
      setError(err.response?.data?.message || 'An error occurred while submitting your request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-black">Request a Service</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-800 rounded">
          ✅ Service request submitted successfully! Our team will review and contact you soon.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-800 rounded">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-bold text-gray-900 font-semibold mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-bold text-gray-900 font-semibold mb-2">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-bold text-gray-900 font-semibold mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={loading}
            placeholder="+234 (your phone number)"
            className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Service Type */}
        <div>
          <label htmlFor="serviceType" className="block text-sm font-bold text-gray-900 font-semibold mb-2">
            Service Type *
          </label>
          <select
            id="serviceType"
            name="serviceType"
            value={formData.serviceType}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          >
            <option value="">-- Select a service --</option>
            <option value="Solar Installation">Solar Installation</option>
            <option value="Battery System Setup">Battery System Setup</option>
            <option value="Electrical Repair">Electrical Repair</option>
            <option value="System Maintenance">System Maintenance</option>
            <option value="Consultation">Consultation</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-bold text-gray-900 font-semibold mb-2">
            Message / Description *
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            disabled={loading}
            placeholder="Describe your service request in detail (at least 10 characters)"
            rows={5}
            className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <p className="text-sm text-black font-bold mt-2">{formData.message.length}/500</p>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Submitting...' : '✓ Submit Service Request'}
          </button>
        </div>
      </form>

      <p className="text-sm text-black font-bold mt-6 text-center">
        Our team will review your request and contact you within 24-48 hours.
      </p>
    </div>
  );
};

