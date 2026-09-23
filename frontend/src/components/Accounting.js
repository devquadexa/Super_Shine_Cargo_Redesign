import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { accountingService } from '../api/services/accountingService';
import PaymentManagement from './PaymentManagement';

function Accounting() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // summary, jobs, customers, payments

  // Date range filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activePreset, setActivePreset] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({ fromDate: '', toDate: '', label: 'All Time' });

  useEffect(() => {
    fetchAccountingData('', '', 'All Time');
  }, []);

  const getPresetDates = (preset) => {
    const today = new Date();
    const toDateStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      return { from: toDateStr, to: toDateStr, label: 'Today' };
    }
    if (preset === 'thisWeek') {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      return { from: monday.toISOString().split('T')[0], to: toDateStr, label: 'This Week' };
    }
    if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: firstDay.toISOString().split('T')[0], to: toDateStr, label: 'This Month' };
    }
    if (preset === 'lastMonth') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        from: firstDayLastMonth.toISOString().split('T')[0],
        to: lastDayLastMonth.toISOString().split('T')[0],
        label: 'Last Month'
      };
    }
    if (preset === 'thisYear') {
      const firstDayYear = new Date(today.getFullYear(), 0, 1);
      return { from: firstDayYear.toISOString().split('T')[0], to: toDateStr, label: 'This Year' };
    }
    return { from: '', to: '', label: 'All Time' };
  };

  const fetchAccountingData = async (from = fromDate, to = toDate, customLabel = null) => {
    try {
      setFiltering(true);
      const result = await accountingService.getDashboard({ fromDate: from, toDate: to });
      setData(result);

      let label = customLabel;
      if (!label) {
        if (!from && !to) {
          label = 'All Time';
        } else if (from && to) {
          label = from === to ? from : `${from} to ${to}`;
        } else if (from) {
          label = `From ${from}`;
        } else if (to) {
          label = `Up to ${to}`;
        }
      }
      setAppliedFilters({ fromDate: from, toDate: to, label });
    } catch (error) {
      console.error('Error fetching accounting data:', error);
      setMessage('Error loading accounting data');
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  const handlePresetSelect = (presetKey) => {
    setActivePreset(presetKey);
    const { from, to, label } = getPresetDates(presetKey);
    setFromDate(from);
    setToDate(to);
    fetchAccountingData(from, to, label);
  };

  const handleApplyFilter = () => {
    if (fromDate && toDate && fromDate > toDate) {
      setMessage('⚠️ "From Date" cannot be after "To Date"');
      setTimeout(() => setMessage(''), 4000);
      return;
    }
    setActivePreset('custom');
    const label = fromDate && toDate 
      ? (fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`)
      : (fromDate ? `From ${fromDate}` : (toDate ? `Up to ${toDate}` : 'All Time'));
    fetchAccountingData(fromDate, toDate, label);
  };

  const handleResetFilter = () => {
    setFromDate('');
    setToDate('');
    setActivePreset('all');
    fetchAccountingData('', '', 'All Time');
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  if (user?.role !== 'Super Admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          Access Denied: This section is only available to Super Admin
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading accounting data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          No data available
        </div>
      </div>
    );
  }

  const { summary, jobFinancials, customerOutstanding } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accounting Dashboard</h1>
            <p className="text-gray-600 mt-1">Detailed financial reports and payment tracking</p>
          </div>
          <button
            onClick={() => fetchAccountingData(fromDate, toDate, appliedFilters.label)}
            disabled={filtering}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium disabled:opacity-50"
          >
            {filtering ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg">
          {message}
        </div>
      )}

      <div className="mb-6">
        <div className="flex border-b border-gray-200 bg-white rounded-t-lg">
          <button 
            className={`px-6 py-4 font-medium transition ${activeTab === 'summary' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button 
            className={`px-6 py-4 font-medium transition ${activeTab === 'jobs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('jobs')}
          >
            Job-wise Details ({jobFinancials.length})
          </button>
          <button 
            className={`px-6 py-4 font-medium transition ${activeTab === 'customers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('customers')}
          >
            Customer Outstanding ({customerOutstanding.length})
          </button>
          <button 
            className={`px-6 py-4 font-medium transition ${activeTab === 'payments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('payments')}
          >
            Payment Management
          </button>
        </div>
      </div>

      <div>
        {activeTab === 'summary' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Financial Summary</h2>
                <p className="text-xs text-gray-500 mt-0.5">High-level financial performance and payment metrics</p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-800 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                <span>Scope: {appliedFilters.label}</span>
              </div>
            </div>

            {/* Date Range Filter Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Date Range Filter</h3>
                    <p className="text-xs text-gray-500">Filter accounting summary and financials by period</p>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-500 mr-1">Presets:</span>
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'thisWeek', label: 'This Week' },
                    { id: 'thisMonth', label: 'This Month' },
                    { id: 'lastMonth', label: 'Last Month' },
                    { id: 'thisYear', label: 'This Year' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetSelect(p.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                        activePreset === p.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Inputs & Apply/Reset Controls */}
              <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setActivePreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setActivePreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyFilter}
                    disabled={filtering}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {filtering ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Filtering...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                        </svg>
                        Apply Filter
                      </>
                    )}
                  </button>

                  {(fromDate || toDate || activePreset !== 'all') && (
                    <button
                      type="button"
                      onClick={handleResetFilter}
                      className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition"
                      title="Reset filter to All Time"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Scope Pill */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-gray-800">Current Scope:</span>
                  <span className="text-gray-700 font-medium">{appliedFilters.label}</span>
                </div>
                <div className="text-gray-500">
                  <span className="font-semibold text-gray-800">{summary.totalJobs}</span> job{summary.totalJobs === 1 ? '' : 's'} in selected period
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Total Jobs:</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalJobs}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Petty Cash Issued:</p>
                <p className="text-2xl font-bold text-gray-900">LKR {formatCurrency(summary.totalPettyCashIssued)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Total Actual Cost:</p>
                <p className="text-2xl font-bold text-gray-900">LKR {formatCurrency(summary.totalActualCost)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Total Billing Amount:</p>
                <p className="text-2xl font-bold text-gray-900">LKR {formatCurrency(summary.totalBillingAmount)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-600 mb-1">Total Profit:</p>
                <p className="text-2xl font-bold text-green-700">LKR {formatCurrency(summary.totalProfit)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Profit Margin:</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.totalBillingAmount > 0 
                    ? `${((summary.totalProfit / summary.totalBillingAmount) * 100).toFixed(2)}%`
                    : '0%'}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-600 mb-1">Paid Jobs:</p>
                <p className="text-2xl font-bold text-green-700">{summary.paidJobsCount}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-xs font-medium text-yellow-600 mb-1">Unpaid Jobs:</p>
                <p className="text-2xl font-bold text-yellow-700">{summary.unpaidJobsCount}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-xs font-medium text-red-600 mb-1">Overdue Jobs:</p>
                <p className="text-2xl font-bold text-red-700">{summary.overdueJobsCount}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-600 mb-1">Total Paid:</p>
                <p className="text-2xl font-bold text-green-700">LKR {formatCurrency(summary.totalPaid)}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-xs font-medium text-yellow-600 mb-1">Total Outstanding:</p>
                <p className="text-2xl font-bold text-yellow-700">LKR {formatCurrency(summary.totalOutstanding)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-xs font-medium text-red-600 mb-1">Total Overdue:</p>
                <p className="text-2xl font-bold text-red-700">LKR {formatCurrency(summary.totalOverdue)}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Job-wise Financial Details</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Job ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Open Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Petty Cash</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actual Cost</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Billing Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Profit</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Payment Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Due Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Overdue Days</th>
                  </tr>
                </thead>
                <tbody>
                  {jobFinancials.map(job => (
                    <tr key={job.jobId} className={`border-b border-gray-200 hover:bg-gray-50 transition ${job.isOverdue ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{job.jobId}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{job.customerName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(job.openDate)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          job.status.toLowerCase().includes('completed') ? 'bg-green-100 text-green-800' :
                          job.status.toLowerCase().includes('closed') ? 'bg-gray-100 text-gray-800' :
                          job.status.toLowerCase().includes('active') ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">LKR {formatCurrency(job.pettyCashIssued)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">LKR {formatCurrency(job.actualCost)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">LKR {formatCurrency(job.billingAmount)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={job.profit >= 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                          LKR {formatCurrency(job.profit)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {job.billingAmount > 0 ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            job.isPaid ? 'bg-green-100 text-green-800' : 
                            job.isOverdue ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {job.isPaid ? 'Paid' : job.isOverdue ? 'Overdue' : 'Pending'}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Not Billed</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(job.dueDate)}</td>
                      <td className="px-6 py-4 text-sm">
                        {job.overdueDays > 0 ? (
                          <span className="text-red-700 font-semibold">{job.overdueDays} days</span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Customer-wise Outstanding</h2>
            {customerOutstanding.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No outstanding payments. All customers are up to date.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Credit Period</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total Outstanding</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Overdue Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Unpaid Jobs</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Overdue Jobs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOutstanding
                      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
                      .map(customer => (
                      <tr key={customer.customerId} className={`border-b border-gray-200 hover:bg-gray-50 transition ${customer.overdueAmount > 0 ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{customer.customerId}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{customer.customerName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{customer.creditPeriodDays} days</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          LKR {formatCurrency(customer.totalOutstanding)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {customer.overdueAmount > 0 ? (
                            <span className="text-red-700 font-semibold">LKR {formatCurrency(customer.overdueAmount)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {customer.unpaidJobsCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {customer.overdueJobsCount > 0 ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {customer.overdueJobsCount}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              0
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
        )}

        {activeTab === 'payments' && (
          <PaymentManagement />
        )}
      </div>
    </div>
  );
}

export default Accounting;
