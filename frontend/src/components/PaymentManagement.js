import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Pagination from './Pagination';
import apiClient from '../api/client';

function PaymentManagement() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('cheques');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [expandedCheque, setExpandedCheque] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);

  const hasAccess = () =>
    user && ['Admin', 'Super Admin', 'Manager'].includes(user.role);

  useEffect(() => {
    if (hasAccess()) fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/payments/all');
      setPayments(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setMessage('Error loading payment data');
      setLoading(false);
    }
  };

  const formatCurrency = (v) =>
    `LKR ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)}`;

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB') : '-';

  const formatCusdecNumberForDisplay = (value) => {
    const rawValue = (value || '').trim();
    if (!rawValue) return '';

    const cleaned = rawValue.replace(/^i\s*-\s*/i, '').trim();
    return cleaned ? `I-${cleaned}` : '';
  };

  // ─── Group cheque payments into cheque records ───────────────────────────
  const chequeGroups = useMemo(() => {
    const chequePayments = payments.filter(p => p.paymentMethod === 'Cheque');
    const map = {};
    chequePayments.forEach(p => {
      const key = p.chequeNumber || p.paymentId;
      if (!map[key]) {
        map[key] = {
          chequeNumber: p.chequeNumber,
          chequeDate: p.chequeDate,
          paymentDate: p.paymentDate,
          chequeAmount: parseFloat(p.chequeAmount) || 0,
          bankName: p.bankName,
          customerName: p.customerName,
          customerId: p.customerId,
          status: p.status,
          invoices: [],
        };
      }
      map[key].invoices.push(p);
      if (parseFloat(p.chequeAmount) > map[key].chequeAmount) {
        map[key].chequeAmount = parseFloat(p.chequeAmount);
      }
      if (p.paymentDate && (!map[key].paymentDate || new Date(p.paymentDate) < new Date(map[key].paymentDate))) {
        map[key].paymentDate = p.paymentDate;
      }
    });
    return Object.values(map)
      .map(g => ({
        ...g,
        totalAllocated: g.invoices.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
        remainingBalance: g.chequeAmount - g.invoices.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      }))
      .sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0));
  }, [payments]);

  const bankTransfers = useMemo(
    () => payments
      .filter(p => p.paymentMethod === 'Bank Transfer')
      .sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0)),
    [payments]
  );

  // ─── Cash payments ────────────────────────────────────────────────────────
  const cashPayments = useMemo(
    () => payments
      .filter(p => p.paymentMethod === 'Cash')
      .sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0)),
    [payments]
  );

  // ─── Summary stats ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalChequeAmount = chequeGroups.reduce((s, g) => s + g.chequeAmount, 0);
    const clearedCheques = chequeGroups.filter(g => g.status === 'Cleared');
    const pendingCheques = chequeGroups.filter(g => g.status === 'Pending');
    const bouncedCheques = chequeGroups.filter(g => g.status === 'Bounced');
    const bankTotal = bankTransfers.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const bankCleared = bankTransfers.filter(p => p.status === 'Cleared').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const cashTotal = cashPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    return {
      totalChequeAmount,
      chequeCount: chequeGroups.length,
      clearedCount: clearedCheques.length,
      clearedAmount: clearedCheques.reduce((s, g) => s + g.chequeAmount, 0),
      pendingCount: pendingCheques.length,
      pendingAmount: pendingCheques.reduce((s, g) => s + g.chequeAmount, 0),
      bouncedCount: bouncedCheques.length,
      bouncedAmount: bouncedCheques.reduce((s, g) => s + g.chequeAmount, 0),
      bankTotal,
      bankCleared,
      cashTotal,
      cashCount: cashPayments.length,
    };
  }, [chequeGroups, bankTransfers, cashPayments]);

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filteredCheques = useMemo(() => {
    let list = chequeGroups;
    if (filterStatus !== 'All') list = list.filter(g => g.status === filterStatus);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(g =>
        (g.chequeNumber || '').toLowerCase().includes(q) ||
        (g.customerName || '').toLowerCase().includes(q) ||
        (g.bankName || '').toLowerCase().includes(q) ||
        g.invoices.some(p => (p.jobId || '').toLowerCase().includes(q) || (p.invoiceNumber || '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [chequeGroups, filterStatus, searchTerm]);

  const filteredBankTransfers = useMemo(() => {
    let list = bankTransfers;
    if (filterStatus !== 'All') list = list.filter(p => p.status === filterStatus);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.bankName || '').toLowerCase().includes(q) ||
        (p.customerName || '').toLowerCase().includes(q) ||
        (p.jobId || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [bankTransfers, filterStatus, searchTerm]);

  const filteredCashPayments = useMemo(() => {
    let list = cashPayments;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.customerName || '').toLowerCase().includes(q) ||
        (p.jobId || '').toLowerCase().includes(q) ||
        (p.invoiceNumber || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [cashPayments, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, activeTab]);

  // ─── Update cheque status (all invoices under same cheque) ────────────────
  const updateChequeStatus = async (chequeNumber, status) => {
    try {
      await apiClient.put(`/payments/cheque/${chequeNumber}/status`, { status });
      setMessage(`Cheque ${chequeNumber} marked as ${status}`);
      fetchPayments();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error updating cheque status');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const updatePaymentStatus = async (paymentId, status) => {
    try {
      await apiClient.put(`/payments/${paymentId}/status`, { status });
      setMessage(`Payment status updated to ${status}`);
      fetchPayments();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error updating status');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // ─── Pagination ───────────────────────────────────────────────────────────
  const activeList = activeTab === 'cheques'
    ? filteredCheques
    : activeTab === 'bank'
      ? filteredBankTransfers
      : filteredCashPayments;
  const totalPages = Math.ceil(activeList.length / recordsPerPage);
  const paginatedList = activeList.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  if (!hasAccess()) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
        Access Denied: Admin, Super Admin, or Manager only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading payment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">

      {/* ── Header ── */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 text-sm mt-1">Track cheques, bank transfers and cash payments linked to invoices</p>
        </div>
        <button onClick={fetchPayments} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {message && (
        <div className={`m-6 p-4 rounded-lg font-medium ${message.includes('Error') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
          {message}
        </div>
      )}

      {/* ── Controls ── */}
      <div className="p-6 space-y-4">
        <div className="flex border-b border-gray-200 gap-0">
          <button className={`flex items-center gap-2 px-6 py-4 font-medium transition ${activeTab === 'cheques' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`} onClick={() => setActiveTab('cheques')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Cheques <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-semibold">{chequeGroups.length}</span>
          </button>
          <button className={`flex items-center gap-2 px-6 py-4 font-medium transition ${activeTab === 'bank' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`} onClick={() => setActiveTab('bank')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
            Bank Transfers <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-semibold">{bankTransfers.length}</span>
          </button>
          <button className={`flex items-center gap-2 px-6 py-4 font-medium transition ${activeTab === 'cash' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`} onClick={() => setActiveTab('cash')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>
              <path d="M6 12h.01M18 12h.01"/>
            </svg>
            Cash <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-semibold">{cashPayments.length}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-3 text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder={
                activeTab === 'cheques' ? 'Search cheque no., customer, job...' :
                activeTab === 'bank'    ? 'Search bank, customer, job...' :
                                         'Search customer, job, invoice...'
              }
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          {activeTab !== 'cash' && (
            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Cleared">Cleared / Deposited</option>
              <option value="Bounced">Bounced</option>
            </select>
          )}
        </div>
      </div>

      {/* ── Cheques Table ── */}
      {activeTab === 'cheques' && (
        <div className="p-6">
          {paginatedList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-600">{searchTerm ? 'No cheques match your search' : 'No cheque payments recorded yet'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Cheque No.</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Cheque Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Cheque Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Allocated</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Balance</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Jobs</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((group) => (
                      <React.Fragment key={group.chequeNumber}>
                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{group.chequeNumber || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{formatDate(group.chequeDate)}</td>
                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-gray-900">{group.customerName || '-'}</div>
                            <div className="text-xs text-gray-500">{group.customerId}</div>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(group.chequeAmount)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(group.totalAllocated)}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`font-semibold ${group.remainingBalance < 0 ? 'text-red-700' : group.remainingBalance === 0 ? 'text-green-700' : 'text-gray-900'}`}>
                              {formatCurrency(group.remainingBalance)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{group.invoices.length} job{group.invoices.length !== 1 ? 's' : ''}</td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition text-xs font-medium"
                              onClick={() => setExpandedCheque(expandedCheque === group.chequeNumber ? null : group.chequeNumber)}
                            >
                              {expandedCheque === group.chequeNumber ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>

                        {/* ── Expanded Cheque Detail ── */}
                        {expandedCheque === group.chequeNumber && (
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <td colSpan="8" className="px-6 py-6">
                              <div className="space-y-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-4 font-semibold text-gray-900">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                    Invoices Covered by This Cheque ({group.invoices.length})
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-gray-300 bg-gray-100">
                                          <th className="px-4 py-2 text-left font-semibold text-gray-700">#</th>
                                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Job ID / CUSDEC Number</th>
                                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Invoice No.</th>
                                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Invoice Amount</th>
                                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Payment Date</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {group.invoices.map((inv, i) => (
                                          <tr key={i} className="border-b border-gray-200 hover:bg-white transition">
                                            <td className="px-4 py-2 text-gray-900 font-medium">{i + 1}</td>
                                            <td className="px-4 py-2 text-gray-900">
                                              {inv.cusdecNumber && inv.cusdecNumber.trim() ? (
                                                <span>{inv.jobId || '-'} / {formatCusdecNumberForDisplay(inv.cusdecNumber)}</span>
                                              ) : (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">{inv.jobId}</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2 text-gray-600">{inv.invoiceNumber || '—'}</td>
                                            <td className="px-4 py-2 text-gray-900 font-semibold">LKR {new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(inv.amount||0)}</td>
                                            <td className="px-4 py-2 text-gray-600">{formatDate(inv.paymentDate)}</td>
                                          </tr>
                                        ))}
                                        <tr className="border-t-2 border-gray-300 bg-gray-100">
                                          <td colSpan="2" className="px-4 py-2 font-semibold text-gray-900">Total Allocated</td>
                                          <td colSpan="2"></td>
                                          <td className="px-4 py-2 font-semibold text-gray-900">LKR {new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(group.totalAllocated||0)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {activeList.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalRecords={activeList.length}
                  recordsPerPage={recordsPerPage}
                  onPageChange={p => setCurrentPage(p)}
                  onRecordsPerPageChange={n => { setRecordsPerPage(n); setCurrentPage(1); }}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ── Bank Transfers Table ── */}
      {activeTab === 'bank' && (
        <div className="p-6">
          {paginatedList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🏦</div>
              <p className="text-gray-600">{searchTerm ? 'No transfers match your search' : 'No bank transfer payments recorded yet'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Bank</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Job ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Invoice No.</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map(p => (
                      <tr key={p.paymentId} className="border-b border-gray-200 hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(p.paymentDate)}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">{p.customerName || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{p.bankName || '-'}</td>
                        <td className="px-6 py-4 text-sm"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">{p.jobId}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-600">{p.invoiceNumber || '-'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            (p.status || 'pending').toLowerCase() === 'cleared' ? 'bg-green-100 text-green-800' :
                            (p.status || 'pending').toLowerCase() === 'bounced' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>{p.status || 'Pending'}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {p.status === 'Pending' && (
                            <button className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded transition text-xs font-medium" onClick={() => updatePaymentStatus(p.paymentId, 'Cleared')}>
                              Confirm
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {activeList.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalRecords={activeList.length}
                  recordsPerPage={recordsPerPage}
                  onPageChange={p => setCurrentPage(p)}
                  onRecordsPerPageChange={n => { setRecordsPerPage(n); setCurrentPage(1); }}
                />
              )}
            </>
          )}
        </div>
      )}
      {/* ── Cash Payments Table ── */}
      {activeTab === 'cash' && (
        <div className="p-6">
          {paginatedList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💵</div>
              <p className="text-gray-600">{searchTerm ? 'No cash payments match your search' : 'No cash payments recorded yet'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Job ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Invoice No.</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map(p => (
                      <tr key={p.paymentId} className="border-b border-gray-200 hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(p.paymentDate)}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">{p.customerName || '-'}</div>
                          <div className="text-xs text-gray-500">{p.customerId}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {p.cusdecNumber && p.cusdecNumber.trim() ? (
                            <span>{p.jobId} / {formatCusdecNumberForDisplay(p.cusdecNumber)}</span>
                          ) : (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">{p.jobId}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{p.invoiceNumber || '-'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{p.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {activeList.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalRecords={activeList.length}
                  recordsPerPage={recordsPerPage}
                  onPageChange={p => setCurrentPage(p)}
                  onRecordsPerPageChange={n => { setRecordsPerPage(n); setCurrentPage(1); }}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PaymentManagement;
