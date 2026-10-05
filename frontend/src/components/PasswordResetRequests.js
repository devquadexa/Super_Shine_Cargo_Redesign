import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { passwordResetService } from '../api/services/passwordResetService';
import Pagination from './Pagination';

function PasswordResetRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(15);

  // Approve modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // View Notes modal state
  const [viewNotesRequest, setViewNotesRequest] = useState(null);

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
      setRequests(Array.isArray(data) ? data : []);
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
    setCopiedPass(false);
    setShowApproveModal(true);
  };

  const handleCopyPassword = () => {
    if (temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
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

      setMessage(`Request approved! Temporary password for ${selectedRequest.userName}: ${result.temporaryPassword}`);
      setMessageType('success');
      setShowApproveModal(false);
      fetchRequests();

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

  const formatDate = (date) => (date ? new Date(date).toLocaleString('en-GB') : '-');

  // KPI Summary counts
  const summary = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'Pending').length;
    const approved = requests.filter(r => r.status === 'Approved').length;
    const rejected = requests.filter(r => r.status === 'Rejected').length;
    return { total, pending, approved, rejected };
  }, [requests]);

  // Filtering
  const filteredRequests = useMemo(() => {
    let list = requests;

    if (statusFilter !== 'All') {
      list = list.filter(r => (r.status || '').toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r =>
        (r.requestId || '').toLowerCase().includes(q) ||
        (r.userName || '').toLowerCase().includes(q) ||
        (r.userFullName || '').toLowerCase().includes(q) ||
        (r.requestedByName || '').toLowerCase().includes(q) ||
        (r.resolvedByName || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [requests, statusFilter, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredRequests.length / recordsPerPage) || 1;
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  if (!hasAccess()) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center border border-red-200">
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
    <div className="p-6 space-y-6 w-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Password Reset Requests</h1>
          <p className="text-gray-600 text-sm mt-1">Review and manage user account recovery & password reset requests</p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg transition font-medium text-sm shadow-xs w-fit"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Status Message ── */}
      {message && (
        <div className={`p-4 rounded-xl font-medium text-sm flex items-center justify-between shadow-xs ${
          messageType === 'success'
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            : 'bg-red-50 text-red-900 border border-red-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full ${messageType === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-4">×</button>
        </div>
      )}

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('All')}
          className={`p-4 rounded-xl border transition cursor-pointer shadow-xs ${
            statusFilter === 'All'
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-gray-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</span>
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs">📋</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{summary.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">All requests</p>
        </div>

        <div
          onClick={() => setStatusFilter('Pending')}
          className={`p-4 rounded-xl border transition cursor-pointer shadow-xs ${
            statusFilter === 'Pending'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-gray-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending</span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs">⏳</span>
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-2">{summary.pending}</p>
          <p className="text-xs text-amber-700 mt-0.5">Awaiting action</p>
        </div>

        <div
          onClick={() => setStatusFilter('Approved')}
          className={`p-4 rounded-xl border transition cursor-pointer shadow-xs ${
            statusFilter === 'Approved'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-gray-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Approved</span>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs">✓</span>
          </div>
          <p className="text-2xl font-bold text-emerald-900 mt-2">{summary.approved}</p>
          <p className="text-xs text-emerald-700 mt-0.5">Password reset set</p>
        </div>

        <div
          onClick={() => setStatusFilter('Rejected')}
          className={`p-4 rounded-xl border transition cursor-pointer shadow-xs ${
            statusFilter === 'Rejected'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-gray-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Rejected</span>
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700 text-xs">✕</span>
          </div>
          <p className="text-2xl font-bold text-rose-900 mt-2">{summary.rejected}</p>
          <p className="text-xs text-rose-700 mt-0.5">Declined</p>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1 relative">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-3 text-gray-400">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search user, username, request ID, resolved by..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium text-gray-700 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status ({requests.length})</option>
              <option value="Pending">Pending ({summary.pending})</option>
              <option value="Approved">Approved ({summary.approved})</option>
              <option value="Rejected">Rejected ({summary.rejected})</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-gray-500 text-sm">Loading requests...</p>
          </div>
        ) : paginatedRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🔑</div>
            <p className="text-gray-700 font-semibold">No password reset requests found</p>
            <p className="text-gray-500 text-xs mt-1">
              {searchTerm || statusFilter !== 'All' ? 'Try adjusting your search or status filter' : 'No user has submitted a password reset request'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-700">
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider w-12">#</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Request ID</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">User / Account</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Request Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Resolved By</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedRequests.map((request, index) => {
                  const itemNumber = (currentPage - 1) * recordsPerPage + index + 1;
                  return (
                    <tr key={request.requestId} className="hover:bg-gray-50/80 transition">
                      <td className="px-6 py-4 text-gray-500 font-medium text-xs">{itemNumber}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md font-semibold border border-gray-200">
                          {request.requestId}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">
                            {request.userFullName || request.userName}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            @{request.userName}
                          </span>
                          {request.requestedByName && request.requestedByName !== request.userFullName && (
                            <span className="text-[11px] text-gray-400 mt-0.5">
                              Req by: {request.requestedByName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        {formatDate(request.requestDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          request.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : request.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            request.status === 'Pending' ? 'bg-amber-600' :
                            request.status === 'Approved' ? 'bg-emerald-600' :
                            'bg-rose-600'
                          }`} />
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {request.resolvedByName ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 text-xs">{request.resolvedByName}</span>
                            {request.resolvedDate && (
                              <span className="text-[11px] text-gray-400">{formatDate(request.resolvedDate)}</span>
                            )}
                            {request.notes && (
                              <button
                                type="button"
                                onClick={() => setViewNotesRequest(request)}
                                className="text-[11px] text-blue-600 hover:text-blue-800 text-left underline mt-0.5"
                              >
                                View note
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {request.status === 'Pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApproveClick(request)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1"
                              title="Approve and generate temporary password"
                            >
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(request.requestId)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                              title="Reject this password reset request"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm font-medium">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredRequests.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={filteredRequests.length}
              recordsPerPage={recordsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
              onRecordsPerPageChange={(n) => { setRecordsPerPage(n); setCurrentPage(1); }}
            />
          </div>
        )}
      </div>

      {/* ── View Notes Modal ── */}
      {viewNotesRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">Resolution Notes</h3>
              <button
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={() => setViewNotesRequest(null)}
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
                <div className="text-gray-600">Request: <strong className="text-gray-900 font-mono">{viewNotesRequest.requestId}</strong></div>
                <div className="text-gray-600">User: <strong className="text-gray-900">{viewNotesRequest.userFullName || viewNotesRequest.userName}</strong></div>
                <div className="text-gray-600">Status: <strong className="text-gray-900">{viewNotesRequest.status}</strong></div>
                {viewNotesRequest.resolvedByName && (
                  <div className="text-gray-600">Resolved by: <strong className="text-gray-900">{viewNotesRequest.resolvedByName}</strong></div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Notes</label>
                <div className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 whitespace-pre-wrap">
                  {viewNotesRequest.notes || 'No notes provided.'}
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewNotesRequest(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Modal ── */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Approve Password Reset</h2>
                <p className="text-xs text-emerald-100 mt-0.5">Generate a temporary password for account recovery</p>
              </div>
              <button
                className="text-white/80 hover:text-white text-2xl leading-none"
                onClick={() => setShowApproveModal(false)}
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1">
                <p className="text-xs text-gray-500">
                  User: <strong className="text-gray-900">{selectedRequest?.userFullName || selectedRequest?.userName}</strong>
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  Username: <strong className="text-gray-900">@{selectedRequest?.userName}</strong>
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  Request ID: <strong className="text-gray-700">{selectedRequest?.requestId}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Temporary Password <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    placeholder="Enter or generate temporary password"
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm font-mono font-semibold text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => setTemporaryPassword(generateRandomPassword())}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                    title="Generate new random password"
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                    title="Copy temporary password"
                  >
                    {copiedPass ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Share this temporary password securely with the user. They will use it to log in.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason or resolution notes..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition font-semibold text-xs disabled:opacity-50 shadow-xs flex items-center gap-1.5"
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
