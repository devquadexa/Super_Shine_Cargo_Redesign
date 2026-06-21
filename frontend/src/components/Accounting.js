import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { accountingService } from '../api/services/accountingService';
import PaymentManagement from './PaymentManagement';

function Accounting() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // summary, jobs, customers, payments

  useEffect(() => {
    fetchAccountingData();
  }, []);

  const fetchAccountingData = async () => {
    try {
      setLoading(true);
      const result = await accountingService.getDashboard();
      setData(result);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching accounting data:', error);
      setMessage('Error loading accounting data');
      setLoading(false);
    }
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
          <button onClick={fetchAccountingData} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium">
            Refresh Data
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">Financial Summary</h2>
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
