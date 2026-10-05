import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { billingService } from '../api/services/billingService';
import apiClient from '../api/client';

const getLocalDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const today = getLocalDateString();

function InvoiceReport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [invoices, setInvoices] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState('All');

  const hasAccess = () => user && ['Admin', 'Super Admin'].includes(user.role);

  const fetchReportData = async () => {
    if (!fromDate || !toDate) {
      setMessage('Please select both From Date and To Date');
      setMessageType('error');
      return;
    }
    if (fromDate > toDate) {
      setMessage('From Date must be on or before To Date');
      setMessageType('error');
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      setCurrentPage(1);
      const data = await billingService.getBills();
      
      // Filter by date range (using invoiceDate or createdDate)
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      const filtered = data.filter(bill => {
        const billDate = new Date(bill.invoiceDate || bill.createdDate || bill.billDate);
        return billDate >= from && billDate <= to;
      });

      setInvoices(filtered);
      setHasSearched(true);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching invoice data:', err);
      setMessage('Error loading invoice data');
      setMessageType('error');
      setInvoices([]);
      setLoading(false);
    }
  };

  // Apply status filter
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'All') return invoices;
    return invoices.filter(inv => inv.paymentStatus === statusFilter);
  }, [invoices, statusFilter]);

  // Summary
  const summary = useMemo(() => {
    const totalBillingAmount = invoices.reduce((s, b) => s + (parseFloat(b.netTotal) || parseFloat(b.billingAmount) || parseFloat(b.total) || 0), 0);
    const totalPaid = invoices.reduce((s, b) => s + (parseFloat(b.paidAmount) || 0), 0);
    const totalOutstanding = totalBillingAmount - totalPaid;
    const paidCount = invoices.filter(b => b.paymentStatus === 'Paid').length;
    const unpaidCount = invoices.filter(b => b.paymentStatus === 'Unpaid').length;
    const partialCount = invoices.filter(b => b.paymentStatus === 'Partially Paid').length;
    return {
      totalInvoices: invoices.length,
      totalBillingAmount,
      totalPaid,
      totalOutstanding,
      paidCount,
      unpaidCount,
      partialCount
    };
  }, [invoices]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / recordsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return filteredInvoices.slice(start, start + recordsPerPage);
  }, [filteredInvoices, currentPage, recordsPerPage]);

  const formatCurrency = (v) =>
    `LKR ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)}`;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

  const dateRangeLabel = fromDate === toDate
    ? formatDate(fromDate)
    : `${formatDate(fromDate)} — ${formatDate(toDate)}`;

  const exportToPDF = async () => {
    try {
      setMessage('Generating PDF...');
      setMessageType('info');
      const res = await apiClient.get(
        `/billing/report/invoices/export/pdf?fromDate=${fromDate}&toDate=${toDate}&status=${statusFilter}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const label = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`;
      link.setAttribute('download', `Invoice_Report_${label}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setMessage('PDF downloaded successfully');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error generating PDF');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const exportToExcel = async () => {
    try {
      setMessage('Generating Excel...');
      setMessageType('info');
      const res = await apiClient.get(
        `/billing/report/invoices/export/excel?fromDate=${fromDate}&toDate=${toDate}&status=${statusFilter}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const label = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`;
      link.setAttribute('download', `Invoice_Report_${label}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setMessage('Excel downloaded successfully');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error generating Excel');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const exportToCSV = () => {
    if (filteredInvoices.length === 0) return;
    const headers = ['#', 'Invoice ID', 'Job ID', 'Customer', 'Invoice Date', 'Due Date', 'Billing Amount', 'Paid Amount', 'Outstanding', 'Status'];
    const rows = filteredInvoices.map((inv, idx) => {
      const billingAmt = parseFloat(inv.netTotal) || parseFloat(inv.billingAmount) || parseFloat(inv.total) || 0;
      const paidAmt = parseFloat(inv.paidAmount) || 0;
      return [
        idx + 1,
        inv.invoiceNumber || inv.billId,
        inv.jobId,
        inv.customerName || inv.customerId || '-',
        formatDate(inv.invoiceDate || inv.createdDate),
        formatDate(inv.dueDate),
        billingAmt.toFixed(2),
        paidAmt.toFixed(2),
        (billingAmt - paidAmt).toFixed(2),
        inv.paymentStatus || 'Unpaid'
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const label = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`;
    link.setAttribute('download', `Invoice_Report_${label}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    setMessage('CSV downloaded successfully');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  if (!hasAccess()) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
          <div className="flex justify-center mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Super Admin and Admin users can access this report.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8">
        <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition" onClick={() => navigate('/reports')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Reports
        </button>
        <span className="text-gray-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
        <span className="text-gray-700 font-medium">Generated Invoices Report</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Generated Invoices Report</h1>
        <p className="text-gray-600 mt-1">View all invoices generated within a selected date range</p>
      </div>

      {/* Date Range Filter Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-6 items-end">
            <div className="flex-1">
              <label htmlFor="from-date" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                From Date
              </label>
              <input
                id="from-date"
                type="date"
                value={fromDate}
                max={toDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="text-gray-400">—</div>

            <div className="flex-1">
              <label htmlFor="to-date" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                To Date
              </label>
              <input
                id="to-date"
                type="date"
                value={toDate}
                min={fromDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <button
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={fetchReportData}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  Generate Report
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <button
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={exportToPDF}
              disabled={!hasSearched || filteredInvoices.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Export to PDF
            </button>

            <button
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={exportToExcel}
              disabled={!hasSearched || filteredInvoices.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <line x1="15" y1="3" x2="15" y2="21"></line>
              </svg>
              Export to Excel
            </button>

            <button
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={exportToCSV}
              disabled={!hasSearched || filteredInvoices.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export to CSV
            </button>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg font-medium flex items-center gap-3 ${
          messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          messageType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <span className="text-lg">
            {messageType === 'success' && '✓'}
            {messageType === 'error' && '✕'}
            {messageType === 'info' && 'ℹ'}
          </span>
          {message}
        </div>
      )}

      {/* Results */}
      {hasSearched && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalInvoices}</p>
              <p className="text-xs text-gray-500 mt-1">{dateRangeLabel}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Billing</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(summary.totalBillingAmount)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.totalPaid)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(summary.totalOutstanding)}</p>
            </div>
          </div>

          {/* Status Filter + Count badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm font-medium text-gray-600">Filter:</span>
            {['All', 'Unpaid', 'Partially Paid', 'Paid'].map(status => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
                <span className="ml-1.5 opacity-80">
                  ({status === 'All' ? summary.totalInvoices :
                    status === 'Paid' ? summary.paidCount :
                    status === 'Unpaid' ? summary.unpaidCount :
                    summary.partialCount})
                </span>
              </button>
            ))}
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex justify-center mb-4">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <p className="text-gray-600">No invoices found for {dateRangeLabel} with status "{statusFilter}"</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-5 py-3 text-left font-semibold text-gray-700">#</th>
                        <th className="px-5 py-3 text-left font-semibold text-gray-700">Invoice ID</th>
                        <th className="px-5 py-3 text-left font-semibold text-gray-700">Job ID</th>
                        <th className="px-5 py-3 text-left font-semibold text-gray-700">Customer</th>
                        <th className="px-5 py-3 text-left font-semibold text-gray-700">Invoice Date</th>
                        <th className="px-5 py-3 text-left font-semibold text-gray-700">Due Date</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-700">Billing Amount</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-700">Paid</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-700">Outstanding</th>
                        <th className="px-5 py-3 text-left font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((inv, index) => {
                        const billingAmt = parseFloat(inv.netTotal) || parseFloat(inv.billingAmount) || parseFloat(inv.total) || 0;
                        const paidAmt = parseFloat(inv.paidAmount) || 0;
                        const outstanding = billingAmt - paidAmt;
                        const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && inv.paymentStatus !== 'Paid';
                        return (
                          <tr key={inv.billId} className={`border-b border-gray-100 hover:bg-gray-50 transition ${isOverdue ? 'bg-red-50/30' : ''}`}>
                            <td className="px-5 py-3 text-gray-500">{(currentPage - 1) * recordsPerPage + index + 1}</td>
                            <td className="px-5 py-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">{inv.invoiceNumber || inv.billId}</span>
                            </td>
                            <td className="px-5 py-3 text-gray-900 font-medium">{inv.jobId}</td>
                            <td className="px-5 py-3 text-gray-900">{inv.customerName || inv.customerId || '-'}</td>
                            <td className="px-5 py-3 text-gray-600">{formatDate(inv.invoiceDate || inv.createdDate)}</td>
                            <td className={`px-5 py-3 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>{formatDate(inv.dueDate)}</td>
                            <td className="px-5 py-3 text-right text-gray-900 font-semibold">{formatCurrency(billingAmt)}</td>
                            <td className="px-5 py-3 text-right text-green-700 font-semibold">{formatCurrency(paidAmt)}</td>
                            <td className={`px-5 py-3 text-right font-semibold ${outstanding > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                              {outstanding > 0 ? formatCurrency(outstanding) : '-'}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                inv.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                                inv.paymentStatus === 'Partially Paid' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {inv.paymentStatus || 'Unpaid'}
                              </span>
                              {isOverdue && <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">OVERDUE</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 p-6 border-t border-gray-200">
                    <button
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >← Previous</button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages} · {filteredInvoices.length} records
                    </span>
                    <button
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Initial state */}
      {!hasSearched && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-4">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <p className="text-gray-600">Select a date range and click <strong>Generate Report</strong> to view generated invoices.</p>
        </div>
      )}

    </div>
  );
}

export default InvoiceReport;
