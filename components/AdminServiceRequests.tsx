'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface ServiceRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  serviceType: string;
  message: string;
  status: string;
  createdAt: string;
  assignedTo: string | null;
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Installer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  assigned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-slate-900 text-white',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export const AdminServiceRequests: React.FC = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ServiceRequest[]>([]);
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Filter requests based on status
    if (filterStatus) {
      setFilteredRequests(requests.filter((r) => r.status === filterStatus));
    } else {
      setFilteredRequests(requests);
    }
  }, [filterStatus, requests]);

  const fetchData = async () => {
    console.log('[ADMIN_SERVICE_REQUESTS] Fetching admin data');
    try {
      setLoading(true);
      // Fetch service requests
      const requestsResponse = await apiClient.get('/service-requests/admin/all');
      if (requestsResponse.data.success) {
        setRequests(requestsResponse.data.data);
        setError(null);
      } else {
        setRequests([]);
        setError('No data returned from server');
      }

      // Fetch installers (assuming there's an endpoint)
      try {
        const installersResponse = await apiClient.get('/installers?role=installer&limit=100');
        if (installersResponse.data.success) {
          setInstallers(installersResponse.data.data);
        }
      } catch (installerErr) {
        console.warn('[ADMIN_SERVICE_REQUESTS] Could not fetch installers');
        setInstallers([]);
      }
    } catch (err: any) {
      console.error('[ADMIN_SERVICE_REQUESTS] Error fetching data:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch service requests';
      setError(errorMsg);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: string, note: string = '') => {
    setUpdatingId(requestId);
    console.log('[ADMIN_SERVICE_REQUESTS] Changing status:', requestId, 'to', newStatus);

    try {
      const response = await apiClient.patch(`/service-requests/admin/${requestId}/status`, {
        status: newStatus,
        note: note || `Status updated to ${newStatus}`,
      });

      if (response.data.success) {
        // Update local state
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
        );
        alert('Status updated successfully!');
      } else {
        alert('Failed to update status');
      }
    } catch (err: any) {
      console.error('[ADMIN_SERVICE_REQUESTS] Error updating status:', err);
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssign = async (requestId: string, installerUserId: string) => {
    setUpdatingId(requestId);
    console.log('[ADMIN_SERVICE_REQUESTS] Assigning request:', requestId, 'to', installerUserId);

    try {
      const response = await apiClient.patch(`/service-requests/admin/${requestId}/assign`, {
        assignToUserId: installerUserId,
      });

      if (response.data.success) {
        // Update local state
        const installer = installers.find((i) => i.id === installerUserId);
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  assignedTo: installerUserId,
                  assignedUser: installer,
                }
              : r
          )
        );
        alert('Assigned successfully!');
      } else {
        alert('Failed to assign');
      }
    } catch (err: any) {
      console.error('[ADMIN_SERVICE_REQUESTS] Error assigning:', err);
      alert(err.response?.data?.message || 'Failed to assign request');
    } finally {
      setUpdatingId(null);
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
      <div className="w-full p-6">
        <div className="text-center py-12">
          <p className="text-lg text-black dark:text-white font-bold">Loading service requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6">
        <div className="p-6 bg-red-100 border-2 border-red-400 text-red-800 rounded-lg">
          <h3 className="font-bold text-lg mb-2">Error Loading Service Requests</h3>
          <p className="mb-4">{error}</p>
          <p className="text-sm mb-4 bg-red-50 p-3 rounded border border-red-300">
            <strong>Troubleshooting:</strong> Check that your backend database connection is properly configured on Render. 
            The backend needs DATABASE_URL or individual database environment variables set.
          </p>
          <div className="space-x-4">
            <button 
              onClick={fetchData} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold inline-block"
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-semibold inline-block"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black dark:text-white">Service Requests Management</h1>
        <p className="text-black dark:text-white font-bold mt-2">Total: {requests.length} requests</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <label htmlFor="statusFilter" className="font-medium text-gray-900">
          Filter by Status:
        </label>
        <select
          id="statusFilter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          onClick={fetchData}
          className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-6 py-3 text-left">Customer</th>
              <th className="px-6 py-3 text-left">Service</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Assigned To</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRequests.map((request) => (
              <React.Fragment key={request.id}>
                {/* Row */}
                <tr className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-black dark:text-white">{request.fullName}</p>
                      <p className="text-sm text-black dark:text-white font-semibold">{request.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-black dark:text-white">{request.serviceType}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status] || 'bg-gray-100'}`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {request.assignedUser ? (
                      <div>
                        <p className="font-medium text-black dark:text-white">
                          {request.assignedUser.firstName} {request.assignedUser.lastName}
                        </p>
                        <p className="text-sm text-black dark:text-white font-semibold">{request.assignedUser.email}</p>
                      </div>
                    ) : (
                      <span className="text-black font-semibold">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-black dark:text-white font-semibold">{formatDate(request.createdAt)}</td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-blue-600 hover:underline">{expandedId === request.id ? '-' : '+'}</button>
                  </td>
                </tr>

                {/* Expanded Details */}
                {expandedId === request.id && (
                  <tr className="bg-gray-50 border-t-2">
                    <td colSpan={6} className="px-6 py-6">
                      <div className="space-y-6">
                        {/* Message */}
                        <div>
                          <h4 className="font-semibold text-black dark:text-white mb-2">Request Details</h4>
                          <p className="text-gray-900 font-semibold bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">{request.message}</p>
                        </div>

                        {/* Phone */}
                        <div>
                          <h4 className="font-semibold text-black dark:text-white mb-2">Contact Information</h4>
                          <p className="text-gray-900 font-semibold">Phone: {request.phone}</p>
                        </div>

                        {/* Status Management */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Change Status */}
                          <div>
                            <h4 className="font-semibold text-black dark:text-white mb-2">Change Status</h4>
                            <select
                              defaultValue={request.status}
                              onChange={(e) => handleStatusChange(request.id, e.target.value)}
                              disabled={updatingId === request.id}
                              className="w-full px-4 py-2 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                            >
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="assigned">Assigned</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>

                          {/* Assign to Installer */}
                          <div>
                            <h4 className="font-semibold text-black dark:text-white mb-2">Assign to Installer</h4>
                            <select
                              defaultValue={request.assignedTo || ''}
                              onChange={(e) => handleAssign(request.id, e.target.value)}
                              disabled={updatingId === request.id || installers.length === 0}
                              className="w-full px-4 py-2 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                            >
                              <option value="">-- Select Installer --</option>
                              {installers.map((installer) => (
                                <option key={installer.id} value={installer.id}>
                                  {installer.firstName} {installer.lastName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Request ID */}
                        <div className="pt-4 border-t border-gray-400">
                          <p className="text-xs text-black font-semibold">Request ID: {request.id}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-black dark:text-white font-bold">No service requests found</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold text-black dark:text-white">{requests.filter((r) => r.status === 'pending').length}</p>
          <p className="text-sm text-black dark:text-white font-bold">Pending</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold text-blue-600">{requests.filter((r) => r.status === 'approved').length}</p>
          <p className="text-sm text-black dark:text-white font-bold">Approved</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold text-purple-600">{requests.filter((r) => r.status === 'assigned').length}</p>
          <p className="text-sm text-black dark:text-white font-bold">Assigned</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold text-orange-600">{requests.filter((r) => r.status === 'in_progress').length}</p>
          <p className="text-sm text-black dark:text-white font-bold">In Progress</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold text-green-600">{requests.filter((r) => r.status === 'completed').length}</p>
          <p className="text-sm text-black dark:text-white font-bold">Completed</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold text-red-600">{requests.filter((r) => r.status === 'rejected').length}</p>
          <p className="text-sm text-black dark:text-white font-bold">Rejected</p>
        </div>
      </div>
    </div>
  );
};

