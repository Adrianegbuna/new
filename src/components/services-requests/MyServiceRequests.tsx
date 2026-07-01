'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface ServiceRequestUpdate {
  id: string;
  oldStatus: string | null;
  newStatus: string;
  note: string | null;
  createdAt: string;
}

interface ServiceRequest {
  id: string;
  fullName: string;
  serviceType: string;
  status: string;
  createdAt: string;
  assignedUser?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  updates: ServiceRequestUpdate[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  approved: 'bg-blue-100 text-blue-800 border-blue-300',
  assigned: 'bg-purple-100 text-purple-800 border-purple-300',
  in_progress: 'bg-slate-900 text-white border-orange-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
};

const statusIcons: Record<string, string> = {
  pending: 'P',
  approved: 'A',
  assigned: 'ASG',
  in_progress: 'IP',
  completed: 'OK',
  rejected: 'X',
};

export const MyServiceRequests: React.FC = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    console.log('[MY_SERVICE_REQUESTS] Fetching service requests');
    try {
      const response = await apiClient.get('/service-requests/my');

      if (response.data.success) {
        setRequests(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch requests');
      }
    } catch (err: any) {
      console.error('[MY_SERVICE_REQUESTS] Error fetching requests:', err);
      setError(err.response?.data?.message || 'An error occurred while fetching your requests');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-lg text-black dark:text-white font-bold">Loading your service requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="p-4 bg-red-100 border border-red-400 text-red-800 rounded">
          Error: {error}
        </div>
        <button
          onClick={fetchRequests}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6 text-black">My Service Requests</h2>
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-black">
          <p className="text-lg text-black dark:text-white font-bold">No service requests yet</p>
          <p className="text-sm text-black dark:text-white font-bold mt-2">Submit your first service request to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black dark:text-white">My Service Requests ({requests.length})</h2>
        <button
          onClick={fetchRequests}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 border-green-600 overflow-hidden">
            {/* Header */}
            <div
              onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
              className="p-4 cursor-pointer hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-black dark:text-white">{request.serviceType}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[request.status] || 'bg-gray-100'}`}>
                      {statusIcons[request.status] || '-'} {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-black dark:text-white font-bold mt-2">From: {request.fullName}</p>
                  <p className="text-xs text-black dark:text-white font-bold">Submitted: {formatDate(request.createdAt)}</p>
                </div>
                <div className="text-2xl">{expandedId === request.id ? '-' : '+'}</div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedId === request.id && (
              <div className="bg-gray-50 border-t p-4 space-y-4">
                {/* Assigned Technician */}
                {request.assignedUser && request.status !== 'pending' && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200">
                    <p className="text-sm text-black dark:text-white font-bold mb-2">
                      <strong>Assigned To:</strong>
                    </p>
                    <p className="font-medium text-black dark:text-white">
                      {request.assignedUser.firstName} {request.assignedUser.lastName}
                    </p>
                    <p className="text-sm text-blue-600">{request.assignedUser.email}</p>
                  </div>
                )}

                {/* Timeline */}
                {request.updates && request.updates.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-black dark:text-white mb-3">Status Timeline</h4>
                    <div className="space-y-3">
                      {request.updates.map((update, index) => (
                        <div key={update.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                            {index < request.updates.length - 1 && <div className="w-0.5 h-12 bg-gray-300"></div>}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <p className="font-medium text-black dark:text-white">
                                {update.oldStatus} {'->'} {update.newStatus}
                              </p>
                              <p className="text-xs text-black font-semibold">{formatDate(update.createdAt)}</p>
                            </div>
                            {update.note && (
                              <p className="text-sm text-black dark:text-gray-100 mt-1">
                                <strong>Note:</strong> {update.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Info */}
                <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-black dark:text-gray-100">
                  {request.status === 'pending' && (
                    'Your request is being reviewed. We will contact you soon with updates.'
                  )}
                  {request.status === 'approved' && (
                    'Your request has been approved! A technician will be assigned shortly.'
                  )}
                  {request.status === 'assigned' && (
                    'Your request has been assigned to a technician. They will contact you to schedule.'
                  )}
                  {request.status === 'in_progress' && (
                    'Your service is currently in progress. The technician will update you on completion.'
                  )}
                  {request.status === 'completed' && (
                    'Your service has been completed! Thank you for using RenewableZmart.'
                  )}
                  {request.status === 'rejected' && (
                    'Your request was not approved. Please contact support for more information.'
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

