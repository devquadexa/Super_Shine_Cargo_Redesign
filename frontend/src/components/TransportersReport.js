import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { jobService } from '../api/services/jobService';
import { transporterService } from '../api/services/transporterService';

// Get today's date in local timezone (YYYY-MM-DD format)
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = getLocalDateString();

function TransportersReport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [transporterReports, setTransporterReports] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(20);

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

      // Fetch all jobs and transporters
      const jobsData = await jobService.getAll();
      const transportersData = await transporterService.getAll();

      const jobs = Array.isArray(jobsData) ? jobsData : [];
      const transporters = Array.isArray(transportersData) ? transportersData : [];

      // Filter jobs by payment date (when transporter cost was paid)
      // Include ALL jobs assigned to transporters, regardless of payment status
      const filteredJobs = jobs.filter(job => {
        const payItems = Array.isArray(job?.payItems) ? job.payItems : [];
        const transporterCostItems = payItems.filter(item => {
          const label = (item?.description || item?.name || '').toLowerCase().trim();
          // Only check for new format with place names
          return label.startsWith('transporter cost (from');
        });

        if (transporterCostItems.length === 0) return false;

        const item = transporterCostItems[0];
        const paidAmount = parseFloat(item.paidAmount || 0) || 0;
        const totalAmount = parseFloat(item.actualCost || item.amount || item.billingAmount || 0) || 0;
        
        // For unpaid jobs (paidAmount = 0), include them regardless of date filtering
        if (paidAmount === 0 && totalAmount > 0) {
          return true;
        }
        
        // For paid/partially paid jobs, filter by payment date
        let paymentDate = null;
        if (item.paidAt) {
          paymentDate = new Date(item.paidAt);
        } else if (job.transportDeliveryDate) {
          paymentDate = new Date(job.transportDeliveryDate);
        } else if (job.createdDate) {
          paymentDate = new Date(job.createdDate);
        }
        
        // If still no date, don't include it
        if (!paymentDate) {
          return false;
        }

        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        return paymentDate >= from && paymentDate <= to;
      });

      // Build transporter reports
      const reports = {};

      filteredJobs.forEach(job => {
        const transporterName = (job?.transporter || '').trim().toLowerCase();
        const transporterId = (job?.transporterId || '').trim().toLowerCase();

        if (!transporterName && !transporterId) return;

        const matchingTransporter = transporters.find(t => {
          const tName = (t?.name || '').trim().toLowerCase();
          const tId = (t?.transporterId || '').trim().toLowerCase();
          return (transporterId && tId === transporterId) || (transporterName && tName === transporterName);
        });

        if (!matchingTransporter) return;

        const key = matchingTransporter.transporterId;
        if (!reports[key]) {
          reports[key] = {
            transporterId: matchingTransporter.transporterId,
            transporterName: matchingTransporter.name,
            mainPhone: matchingTransporter.mainPhone || matchingTransporter.phone,
            email: matchingTransporter.email,
            jobs: [],
            totalCost: 0,
            totalPaid: 0,
            totalBalance: 0,
          };
        }

        // Get transporter cost from job
        const payItems = Array.isArray(job?.payItems) ? job.payItems : [];
        const transporterCostItems = payItems.filter(item => {
          const label = (item?.description || item?.name || '').toLowerCase().trim();
          // Only check for new format with place names
          return label.startsWith('transporter cost (from');
        });

        if (transporterCostItems.length > 0) {
          const item = transporterCostItems[0];
          const cost = parseFloat(item.actualCost || item.amount || 0) || 0;
          const paid = parseFloat(item.paidAmount || 0) || 0;
          const balance = Math.max(0, cost - paid);

          reports[key].jobs.push({
            jobId: job.jobId,
            category: job.shipmentCategory,
            deliveryDate: job.transportDeliveryDate,
            cost,
            paid,
            balance,
            status: item.paymentStatus || 'Unpaid',
          });

          reports[key].totalCost += cost;
          reports[key].totalPaid += paid;
          reports[key].totalBalance += balance;
        }
      });

      const reportsArray = Object.values(reports).sort((a, b) => 
        a.transporterName.localeCompare(b.transporterName)
      );

      setTransporterReports(reportsArray);
      setHasSearched(true);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setMessage('Error loading report data');
      setMessageType('error');
      setTransporterReports([]);
      setLoading(false);
    }
  };

  // Summary
  const summary = useMemo(() => {
    const totalCost = transporterReports.reduce((s, r) => s + r.totalCost, 0);
    const totalPaid = transporterReports.reduce((s, r) => s + r.totalPaid, 0);
    const totalBalance = transporterReports.reduce((s, r) => s + r.totalBalance, 0);
    return {
      totalCost,
      totalPaid,
      totalBalance,
      transporterCount: transporterReports.length,
      jobCount: transporterReports.reduce((s, r) => s + r.jobs.length, 0),
    };
  }, [transporterReports]);

  // Pagination
  const totalPages = Math.ceil(transporterReports.length / recordsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return transporterReports.slice(start, start + recordsPerPage);
  }, [transporterReports, currentPage, recordsPerPage]);

  const exportToPDF = async () => {
    try {
      setMessage('Generating PDF...');
      setMessageType('info');
      const res = await apiClient.get(
        `/transporters/report/export/pdf?fromDate=${fromDate}&toDate=${toDate}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const label = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`;
      link.setAttribute('download', `Transporters_Report_${label}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setMessage('PDF downloaded successfully');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setMessage('Error generating PDF');
      setMessageType('error');
    }
  };

  const exportToExcel = async () => {
    try {
      setMessage('Generating Excel...');
      setMessageType('info');
      const res = await apiClient.get(
        `/transporters/report/export/excel?fromDate=${fromDate}&toDate=${toDate}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const label = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`;
      link.setAttribute('download', `Transporters_Report_${label}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setMessage('Excel downloaded successfully');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error generating Excel:', err);
      setMessage('Error generating Excel');
      setMessageType('error');
    }
  };

  const formatCurrency = (v) =>
    `LKR ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)}`;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

  const dateRangeLabel = fromDate === toDate
    ? formatDate(fromDate)
    : `${formatDate(fromDate)} — ${formatDate(toDate)}`;

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
        <span className="text-gray-700 font-medium">Transporters Report</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Transporters Report</h1>
        <p className="text-gray-600 mt-1">Transporter-wise payment details and job assignments for a selected date range</p>
      </div>

      {/* Date Range Filter Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-6 items-end">
            <div className="flex-1 min-w-[200px]">
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

            <div className="flex-1 min-w-[200px]">
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
              disabled={!hasSearched || transporterReports.length === 0}
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
              disabled={!hasSearched || transporterReports.length === 0}
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

      {/* Summary and Export */}
      {hasSearched && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-blue-500">
              <div className="text-sm font-medium text-gray-600">Total Cost</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(summary.totalCost)}</div>
              <div className="text-xs text-gray-500 mt-2">{summary.jobCount} jobs</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-green-500">
              <div className="text-sm font-medium text-gray-600">Total Paid</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(summary.totalPaid)}</div>
              <div className="text-xs text-gray-500 mt-2">Completed payments</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-teal-500">
              <div className="text-sm font-medium text-gray-600">Total Balance</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(summary.totalBalance)}</div>
              <div className="text-xs text-gray-500 mt-2">Pending payment</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-purple-500">
              <div className="text-sm font-medium text-gray-600">Transporters</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{summary.transporterCount}</div>
              <div className="text-xs text-gray-500 mt-2">Active transporters</div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {transporterReports.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-gray-400 text-4xl mb-4">🚚</div>
                <p className="text-gray-500">No transporter payments found for {dateRangeLabel}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left font-medium text-gray-700">#</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Transporter ID</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Transporter Name</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Phone</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Email</th>
                        <th className="px-6 py-3 text-right font-medium text-gray-700">Total Cost</th>
                        <th className="px-6 py-3 text-right font-medium text-gray-700">Total Paid</th>
                        <th className="px-6 py-3 text-right font-medium text-gray-700">Balance</th>
                        <th className="px-6 py-3 text-center font-medium text-gray-700">Jobs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((r, index) => (
                        <tr key={r.transporterId} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-700">{(currentPage - 1) * recordsPerPage + index + 1}</td>
                          <td className="px-6 py-4 font-mono text-xs bg-gray-50 rounded">{r.transporterId}</td>
                          <td className="px-6 py-4 text-gray-900">{r.transporterName}</td>
                          <td className="px-6 py-4 text-gray-600">{r.mainPhone || '-'}</td>
                          <td className="px-6 py-4 text-gray-600 text-xs">{r.email || '-'}</td>
                          <td className="px-6 py-4 text-right text-gray-900 font-medium">{formatCurrency(r.totalCost)}</td>
                          <td className="px-6 py-4 text-right text-green-600 font-medium">{formatCurrency(r.totalPaid)}</td>
                          <td className="px-6 py-4 text-right font-medium" style={{color: r.totalBalance > 0 ? '#d97706' : '#6b7280'}}>{r.totalBalance > 0 ? formatCurrency(r.totalBalance) : formatCurrency(0)}</td>
                          <td className="px-6 py-4 text-center text-gray-700">{r.jobs.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 p-6 border-t border-gray-200">
                    <button
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >← Previous</button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages} · {transporterReports.length} records
                    </span>
                    <button
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="text-gray-300 text-5xl mb-4">📅</div>
          <p className="text-gray-600">Select a date range and click <strong>Generate Report</strong> to view transporter payment details.</p>
        </div>
      )}

    </div>
  );
}

export default TransportersReport;
