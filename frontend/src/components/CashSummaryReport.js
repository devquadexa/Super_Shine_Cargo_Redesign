import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cashWithdrawalService } from '../api/services/cashWithdrawalService';
import { otherExpenseService } from '../api/services/otherExpenseService';
import API_BASE from '../api/config';

// Get today's date in local timezone (YYYY-MM-DD format)
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = getLocalDateString();

function CashSummaryReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  // Date filters
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  
  // Data
  const [cashWithdrawals, setCashWithdrawals] = useState([]);
  const [pettyCashAssignments, setPettyCashAssignments] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [cashDeposits, setCashDeposits] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const hasAccess = () => user && ['Admin', 'Super Admin'].includes(user.role);

  // Summary calculations
  const summary = useMemo(() => {
    const totalWithdrawn = cashWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
    const totalPettyCash = pettyCashAssignments.reduce((sum, a) => sum + parseFloat(a.assignedAmount || 0), 0);
    const totalExpenses = otherExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalDeposited = cashDeposits.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
    const availableBalance = totalWithdrawn - totalPettyCash - totalExpenses;
    
    return {
      totalWithdrawn,
      totalPettyCash,
      totalExpenses,
      totalDeposited,
      availableBalance,
      withdrawalCount: cashWithdrawals.length,
      assignmentCount: pettyCashAssignments.length,
      expenseCount: otherExpenses.length,
      depositCount: cashDeposits.length
    };
  }, [cashWithdrawals, pettyCashAssignments, otherExpenses, cashDeposits]);

  const fetchData = async () => {
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

    setLoading(true);
    setMessage('');

    try {
      // Helper function to compare dates (ignoring time)
      const isDateInRange = (dateStr, fromDateStr, toDateStr) => {
        if (!dateStr) return false;
        
        // Extract just the date part (YYYY-MM-DD)
        const dateOnly = dateStr.split('T')[0];
        return dateOnly >= fromDateStr && dateOnly <= toDateStr;
      };

      // Fetch cash withdrawals (exclude deposits)
      const withdrawals = await cashWithdrawalService.getAll();
      console.log('All withdrawals:', withdrawals);
      const filteredWithdrawals = withdrawals.filter(w => 
        w.transactionType !== 'deposit' &&
        isDateInRange(w.withdrawalDate, fromDate, toDate)
      );
      console.log('Filtered withdrawals:', filteredWithdrawals);
      setCashWithdrawals(filteredWithdrawals);

      // Fetch petty cash assignments
      const response = await fetch(`${API_BASE}/api/petty-cash-assignments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const assignments = await response.json();
        console.log('All assignments:', assignments);
        const filteredAssignments = assignments.filter(a => 
          isDateInRange(a.assignedDate, fromDate, toDate)
        );
        console.log('Filtered assignments:', filteredAssignments);
        setPettyCashAssignments(filteredAssignments);
      }

      // Fetch other expenses
      const expenses = await otherExpenseService.getAll();
      console.log('All expenses:', expenses);
      const filteredExpenses = expenses.filter(e => 
        isDateInRange(e.expenseDate, fromDate, toDate)
      );
      console.log('Filtered expenses:', filteredExpenses);
      setOtherExpenses(filteredExpenses);

      // Fetch cash deposits (from withdrawals table with transactionType === 'deposit')
      try {
        const depositsResponse = await fetch(`${API_BASE}/api/cash-withdrawals`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (depositsResponse.ok) {
          const allTransactions = await depositsResponse.json();
          // Filter only deposits
          const deposits = allTransactions
            .filter(t => t.transactionType === 'deposit')
            .filter(d => isDateInRange(d.withdrawalDate, fromDate, toDate));
          
          console.log('Filtered deposits:', deposits);
          setCashDeposits(deposits);
        } else {
          setCashDeposits([]);
        }
      } catch (depositError) {
        console.error('Error fetching deposits:', depositError);
        setCashDeposits([]);
      }

      setHasSearched(true);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Error loading report data');
      setMessageType('error');
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `LKR ${parseFloat(amount || 0).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

  const exportToExcel = async () => {
    try {
      setMessage('Generating Excel...');
      setMessageType('info');
      
      const response = await fetch(
        `${API_BASE}/api/cash-summary/export/excel?fromDate=${fromDate}&toDate=${toDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate Excel');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const label = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`;
      link.setAttribute('download', `Cash_Summary_Report_${label}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      setMessage('Excel downloaded successfully');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      setMessage('Error generating Excel');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const exportToPDF = async () => {
    try {
      setMessage('Generating PDF...');
      setMessageType('info');
      
      const response = await fetch(
        `${API_BASE}/api/cash-summary/export/pdf?fromDate=${fromDate}&toDate=${toDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const label = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`;
      link.setAttribute('download', `Cash_Summary_Report_${label}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      setMessage('PDF downloaded successfully');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setMessage('Error generating PDF');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (!hasAccess()) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
          <div className="flex justify-center mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Reports
        </button>
        <span className="text-gray-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
        <span className="text-gray-700 font-medium">Cash Summary Report</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Cash Summary Report</h1>
        <p className="text-gray-600 mt-1">
          Comprehensive cash flow overview with withdrawals, petty cash and expenses
        </p>
      </div>

      {/* Filter Panel */}
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
                onChange={(e) => setFromDate(e.target.value)}
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
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <button
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={fetchData}
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
              disabled={!hasSearched || loading}
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
              disabled={!hasSearched || loading}
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

      {/* Message */}
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

      {/* Summary Cards */}
      {hasSearched && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-blue-500">
              <div className="text-2xl mb-2">💰</div>
              <div className="text-sm font-medium text-gray-600">Total Cash Withdrawn</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(summary.totalWithdrawn)}</div>
              <div className="text-xs text-gray-500 mt-2">{summary.withdrawalCount} withdrawal{summary.withdrawalCount !== 1 ? 's' : ''}</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-purple-500">
              <div className="text-2xl mb-2">📤</div>
              <div className="text-sm font-medium text-gray-600">Petty Cash Issued</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(summary.totalPettyCash)}</div>
              <div className="text-xs text-gray-500 mt-2">{summary.assignmentCount} assignment{summary.assignmentCount !== 1 ? 's' : ''}</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-amber-500">
              <div className="text-2xl mb-2">💳</div>
              <div className="text-sm font-medium text-gray-600">Other Expenses</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(summary.totalExpenses)}</div>
              <div className="text-xs text-gray-500 mt-2">{summary.expenseCount} expense{summary.expenseCount !== 1 ? 's' : ''}</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-teal-500">
              <div className="text-2xl mb-2">🏦</div>
              <div className="text-sm font-medium text-gray-600">Total Cash Deposited</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(summary.totalDeposited)}</div>
              <div className="text-xs text-gray-500 mt-2">{summary.depositCount} deposit{summary.depositCount !== 1 ? 's' : ''}</div>
            </div>

            <div className={`bg-white rounded-lg shadow-sm p-6 border-t-4 ${summary.availableBalance >= 0 ? 'border-green-500' : 'border-red-500'}`}>
              <div className="text-2xl mb-2">{summary.availableBalance >= 0 ? '✅' : '⚠️'}</div>
              <div className="text-sm font-medium text-gray-600">Available Balance</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(summary.availableBalance)}</div>
              <div className="text-xs text-gray-500 mt-2">
                {summary.availableBalance >= 0 ? 'Positive balance' : 'Negative balance'}
              </div>
            </div>
          </div>

          {/* Cash Withdrawals Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Cash Withdrawals ({summary.withdrawalCount})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Withdrawal ID</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Bank Name</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Recorded By</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {cashWithdrawals.map(withdrawal => (
                    <tr key={withdrawal.withdrawalId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs bg-gray-50 rounded">{withdrawal.withdrawalId}</td>
                      <td className="px-6 py-4 text-gray-700">{formatDate(withdrawal.withdrawalDate)}</td>
                      <td className="px-6 py-4 text-gray-700">{withdrawal.bankName}</td>
                      <td className="px-6 py-4 text-right text-gray-900 font-medium">{formatCurrency(withdrawal.amount)}</td>
                      <td className="px-6 py-4 text-gray-700">{withdrawal.recordedByName || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 text-xs">{withdrawal.notes || '-'}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan="3" className="px-6 py-4 font-bold text-gray-900">TOTAL</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(summary.totalWithdrawn)}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cash Deposits Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Cash Deposits ({summary.depositCount})</h2>
            </div>
            {cashDeposits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left font-medium text-gray-700">Deposit ID</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-700">Date</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-700">Bank Name</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-700">Amount</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-700">Recorded By</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashDeposits.map(deposit => (
                      <tr key={deposit.withdrawalId} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-xs bg-gray-50 rounded">{deposit.withdrawalId}</td>
                        <td className="px-6 py-4 text-gray-700">{formatDate(deposit.withdrawalDate)}</td>
                        <td className="px-6 py-4 text-gray-700">{deposit.bankName}</td>
                        <td className="px-6 py-4 text-right text-gray-900 font-medium">{formatCurrency(deposit.amount)}</td>
                        <td className="px-6 py-4 text-gray-700">{deposit.createdByName || deposit.createdBy || '-'}</td>
                        <td className="px-6 py-4 text-gray-600 text-xs">{deposit.notes || '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan="3" className="px-6 py-4 font-bold text-gray-900">TOTAL</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(summary.totalDeposited)}</td>
                      <td colSpan="2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">No cash deposits recorded for the selected date range</div>
            )}
          </div>

          {/* Petty Cash Assignments Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Petty Cash Issued ({summary.assignmentCount})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Assignment ID</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Job ID</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Assigned To</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pettyCashAssignments.map(assignment => (
                    <tr key={assignment.assignmentId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs bg-gray-50 rounded">{assignment.assignmentId}</td>
                      <td className="px-6 py-4 text-gray-700">{formatDate(assignment.assignedDate)}</td>
                      <td className="px-6 py-4 text-gray-700">{assignment.jobId}</td>
                      <td className="px-6 py-4 text-gray-700">{assignment.assignedToName || '-'}</td>
                      <td className="px-6 py-4 text-right text-gray-900 font-medium">{formatCurrency(assignment.assignedAmount)}</td>
                      <td className="px-6 py-4"><span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">{assignment.status}</span></td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan="4" className="px-6 py-4 font-bold text-gray-900">TOTAL</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(summary.totalPettyCash)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Other Expenses Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Other Expenses ({summary.expenseCount})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Expense ID</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Category</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Description</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Payment Method</th>
                  </tr>
                </thead>
                <tbody>
                  {otherExpenses.map(expense => (
                    <tr key={expense.expenseId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs bg-gray-50 rounded">{expense.expenseId}</td>
                      <td className="px-6 py-4 text-gray-700">{formatDate(expense.expenseDate)}</td>
                      <td className="px-6 py-4"><span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700">{expense.category}</span></td>
                      <td className="px-6 py-4 text-gray-700">{expense.description}</td>
                      <td className="px-6 py-4 text-right text-gray-900 font-medium">{formatCurrency(expense.amount)}</td>
                      <td className="px-6 py-4 text-gray-600">{expense.paymentMethod || '-'}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan="4" className="px-6 py-4 font-bold text-gray-900">TOTAL</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(summary.totalExpenses)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !hasSearched && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-300 text-5xl mb-4">📊</div>
          <p className="text-gray-600">Select date range and click "Generate Report" to view data</p>
        </div>
      )}

      {!loading && hasSearched && cashWithdrawals.length === 0 && pettyCashAssignments.length === 0 && otherExpenses.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-300 text-5xl mb-4">📊</div>
          <p className="text-gray-600">No data found for the selected date range</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting your date filters</p>
        </div>
      )}
    </div>
  );
}

export default CashSummaryReport;
