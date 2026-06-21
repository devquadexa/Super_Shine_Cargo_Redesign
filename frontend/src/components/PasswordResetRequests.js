import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { passwordResetService } from '../api/services/passwordResetService';

function PasswordResetRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const hasAccess = () => user && user.role === 'Super Admin';

  useEffect(() => {
    if (hasAccess()) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await passwordResetService.getPasswordResetRequests();
      setRequests(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setMessage('Error loading password reset requests');
      setMessageType('error');
      setLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    setTemporaryPassword(generateRandomPassword());
    setNotes('');
    setShowApproveModal(true);
  };

  const handleApprove = async () => {
    if (!temporaryPassword || temporaryPassword.length < 6) {
      setMessage('Temporary password must be at least 6 characters');
      setMessageType('error');
      return;
    }

    try {
      setActionLoading(true);
      const result = await passwordResetService.approvePasswordResetRequest(
        selectedRequest.requestId,
        temporaryPassword,
        notes
      );
      
      setMessage(`Request approved! Temporary password: ${result.temporaryPassword}`);
      setMessageType('success');
      setShowApproveModal(false);
      fetchRequests();
      
      // Auto-hide success message after 10 seconds
      setTimeout(() => setMessage(''), 10000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error approving request');
      setMessageType('error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm('Are you sure you want to reject this password reset request?')) {
      return;
    }

    try {
      await passwordResetService.rejectPasswordResetRequest(requestId, 'Request rejected by administrator');
      setMessage('Request rejected successfully');
      setMessageType('success');
      fetchRequests();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error rejecting request');
      setMessageType('error');
    }
  };

  const formatDate = (date) => date ? new Date(date).toLocaleString('en-GB') : '-';

  if (!hasAccess()) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center border border-red-200">
          <div className="flex justify-center mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Super Admin users can access password reset requests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Password Reset Requests</h1>
        <p className="text-gray-600 mt-1">Manage user password reset requests</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg font-medium flex items-center gap-3 ${messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span className="text-lg">
            {messageType === 'success' && '✓'}
            {messageType === 'error' && '✕'}
          </span>
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <p className="text-gray-500">No password reset requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-700">#</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Request ID</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">User</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Username</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Requested By</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Request Date</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Resolved By</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request, index) => (
                  <tr key={request.requestId} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-700">{index + 1}</td>
                    <td className="px-6 py-4 font-mono text-xs bg-gray-50 rounded">{request.requestId}</td>
                    <td className="px-6 py-4 text-gray-900">{request.userFullName}</td>
                    <td className="px-6 py-4 text-gray-900">{request.userName}</td>
                    <td className="px-6 py-4 text-gray-600">{request.requestedByName}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(request.requestDate)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === 'Pending' ? 'bg-yellow-50 text-yellow-700' :
                        request.status === 'Approved' ? 'bg-green-50 text-green-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{request.resolvedByName || '-'}</td>
                    <td className="px-6 py-4">
                      {request.status === 'Pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveClick(request)}
                            className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request.requestId)}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {request.status !== 'Pending' && (
                        <span className="text-xs text-gray-500">
                          {request.status === 'Approved' ? 'Completed' : 'Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Approve Password Reset</h2>
              <button className="text-gray-400 hover:text-gray-600 text-2xl leading-none" onClick={() => setShowApproveModal(false)}>×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>User:</strong> {selectedRequest?.userFullName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Username:</strong> {selectedRequest?.userName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporary Password <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    placeholder="Enter temporary password"
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setTemporaryPassword(generateRandomPassword())}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This password will be shared with the user. They must change it on first login.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium text-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Approving...' : 'Approve & Set Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PasswordResetRequests;
