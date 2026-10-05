import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { otherExpenseService } from '../api/services/otherExpenseService';
import { formatDate } from '../utils/dateFormatter';
import API_BASE from '../api/config';

// 2 Primary customizable categories
const EXPENSE_CATEGORIES = ['General', 'Operational'];

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Card'];

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

function OtherExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState({ General: [], Operational: [] });
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  const [expandedRow, setExpandedRow] = useState(null);

  const [formData, setFormData] = useState({
    category: 'General',
    expenseType: '',
    description: '',
    amount: '',
    expenseDate: getTodayDate(),
    paymentMethod: '',
    referenceNumber: '',
    notes: ''
  });

  // Check if user has access to view the page
  const hasAccess = () => {
    return user && ['Admin', 'Super Admin', 'Manager', 'Staff'].includes(user.role);
  };

  // Check if user can create expenses
  const canCreate = () => {
    return user && ['Admin', 'Super Admin', 'Manager', 'Staff'].includes(user.role);
  };

  // Check if user can edit/delete expenses (only Admin and Super Admin)
  const canEditDelete = () => {
    return user && ['Admin', 'Super Admin'].includes(user.role);
  };

  // Format amount with commas
  const formatAmount = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  useEffect(() => {
    if (hasAccess()) {
      fetchExpenses();
      fetchExpenseTypes();
    }
  }, [user]);

  const fetchExpenseTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/expense-types/all`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setExpenseTypes(data || { General: [], Operational: [] });
      }
    } catch (error) {
      console.error('Error loading expense types in OtherExpenses:', error);
    }
  };

  const fetchExpenses = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await otherExpenseService.getAll();
      setExpenses(data);
      if (showLoading) setLoading(false);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setMessage('Error loading expenses');
      setMessageType('error');
      if (showLoading) setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isEditing) {
        const updated = await otherExpenseService.update(selectedExpense.expenseId, formData);
        const merged = { ...selectedExpense, ...formData, amount: parseFloat(formData.amount) || selectedExpense.amount, ...(updated || {}) };
        setExpenses(prev => prev.map(item => item.expenseId === selectedExpense.expenseId ? merged : item));
        setMessage('Expense updated successfully!');
      } else {
        const created = await otherExpenseService.create(formData);
        if (created) {
          setExpenses(prev => [created, ...prev]);
        }
        setMessage('Expense created successfully!');
      }
      setMessageType('success');
      resetForm();
      fetchExpenses(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving expense:', error);
      setMessage(error.response?.data?.message || 'Error saving expense');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setIsEditing(true);
    setFormData({
      category: expense.category || 'General',
      expenseType: expense.expenseType || '',
      description: expense.description,
      amount: expense.amount,
      expenseDate: expense.expenseDate ? expense.expenseDate.split('T')[0] : getTodayDate(),
      paymentMethod: expense.paymentMethod || '',
      referenceNumber: expense.referenceNumber || '',
      notes: expense.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }
    // Optimistic delete
    setExpenses(prev => prev.filter(e => e.expenseId !== expenseId));
    setMessage('Expense deleted successfully!');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);

    try {
      await otherExpenseService.delete(expenseId);
      fetchExpenses(false);
    } catch (error) {
      console.error('Error deleting expense:', error);
      setMessage('Error deleting expense');
      setMessageType('error');
      fetchExpenses(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'General',
      expenseType: '',
      description: '',
      amount: '',
      expenseDate: getTodayDate(),
      paymentMethod: '',
      referenceNumber: '',
      notes: ''
    });
    setShowModal(false);
    setIsEditing(false);
    setSelectedExpense(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatCurrency = (amount) => {
    return `LKR ${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (expense.description && expense.description.toLowerCase().includes(searchLower)) ||
      (expense.category && expense.category.toLowerCase().includes(searchLower)) ||
      (expense.expenseType && expense.expenseType.toLowerCase().includes(searchLower)) ||
      (expense.expenseId && expense.expenseId.toLowerCase().includes(searchLower)) ||
      (expense.recordedByName && expense.recordedByName.toLowerCase().includes(searchLower));
    
    const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter;
    const matchesType = typeFilter === 'All' || expense.expenseType === typeFilter;
    
    return matchesSearch && matchesCategory && matchesType;
  }).sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredExpenses.slice(indexOfFirstRecord, indexOfLastRecord);

  // Calculate total
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

  if (!hasAccess()) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Other Expenses</h1>
            <p className="text-gray-600 mt-1">Track office expenses like food, utilities, WiFi, and phone cards</p>
          </div>
          {canCreate() && (
            <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">
              + New Expense
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg font-medium ${messageType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">All Expenses ({filteredExpenses.length})</h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setTypeFilter('All');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            >
              <option value="All">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            >
              <option value="All">All Expense Types</option>
              {categoryFilter === 'All' ? (
                <>
                  <optgroup label="General">
                    {(expenseTypes.General || []).map(t => (
                      <option key={`gen-${t.typeId}`} value={t.typeName}>{t.typeName}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Operational">
                    {(expenseTypes.Operational || []).map(t => (
                      <option key={`op-${t.typeId}`} value={t.typeName}>{t.typeName}</option>
                    ))}
                  </optgroup>
                </>
              ) : (
                (expenseTypes[categoryFilter] || []).map(t => (
                  <option key={t.typeId} value={t.typeName}>{t.typeName}</option>
                ))
              )}
            </select>

            <input
              type="text"
              placeholder="Search by description, type, category, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[220px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">💰</div>
            <p className="text-gray-600">{searchTerm || categoryFilter !== 'All' || typeFilter !== 'All' ? 'No expenses found matching your filters' : 'No expenses recorded yet'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Expense ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Expense Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Payment Method</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Recorded By</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map(expense => (
                    <React.Fragment key={expense.expenseId}>
                      <tr className="border-b border-gray-200 hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{expense.expenseId}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(expense.expenseDate)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            expense.category === 'Operational' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {expense.expenseType || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{expense.description}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(expense.amount)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{expense.paymentMethod || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{expense.recordedByName || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            {canEditDelete() && (
                              <button
                                className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition text-xs font-medium"
                                onClick={() => handleEdit(expense)}
                                title="Edit Expense"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition text-xs font-medium"
                              onClick={() => setExpandedRow(expandedRow === expense.expenseId ? null : expense.expenseId)}
                              title="View Details"
                            >
                              {expandedRow === expense.expenseId ? 'Hide' : 'View'}
                            </button>
                            {canEditDelete() && (
                              <button
                                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded transition text-xs font-medium"
                                onClick={() => handleDelete(expense.expenseId)}
                                title="Delete Expense"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedRow === expense.expenseId && (
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <td colSpan="9" className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-4">Expense Details</h4>
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 mb-1">Category:</p>
                                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                                      expense.category === 'Operational' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {expense.category}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 mb-1">Expense Type:</p>
                                    <p className="text-sm font-semibold text-gray-900">{expense.expenseType || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 mb-1">Date:</p>
                                    <p className="text-sm text-gray-900">{formatDate(expense.expenseDate)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 mb-1">Amount:</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(expense.amount)}</p>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold text-gray-900 mb-4">Payment Information</h4>
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 mb-1">Payment Method:</p>
                                    <p className="text-sm text-gray-900">{expense.paymentMethod || '-'}</p>
                                  </div>
                                  {expense.referenceNumber && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-600 mb-1">Reference Number:</p>
                                      <p className="text-sm text-gray-900">{expense.referenceNumber}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 mb-1">Recorded By:</p>
                                    <p className="text-sm text-gray-900">{expense.recordedByName || '-'}</p>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold text-gray-900 mb-4">Description & Notes</h4>
                                <p className="text-sm text-gray-900 mb-4">{expense.description}</p>
                                {expense.notes && (
                                  <>
                                    <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                                    <p className="text-sm text-gray-900">{expense.notes}</p>
                                  </>
                                )}
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 p-6 border-t border-gray-200">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Expense' : 'New Expense'}</h2>
                <p className="text-xs text-gray-500 mt-1">Record a General or Operational expense with customizable type</p>
              </div>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Category Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Category <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`py-2.5 px-4 rounded-lg font-medium text-sm border flex items-center justify-center gap-2 transition ${
                      formData.category === 'General'
                        ? 'bg-blue-50 border-blue-600 text-blue-700 font-semibold shadow-sm'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, category: 'General', expenseType: '' }))}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    General Expense
                  </button>
                  <button
                    type="button"
                    className={`py-2.5 px-4 rounded-lg font-medium text-sm border flex items-center justify-center gap-2 transition ${
                      formData.category === 'Operational'
                        ? 'bg-amber-50 border-amber-600 text-amber-700 font-semibold shadow-sm'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, category: 'Operational', expenseType: '' }))}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                    Operational Expense
                  </button>
                </div>
              </div>

              {/* Expense Type and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Expense Type <span className="text-red-600">*</span>
                    </label>
                    {['Admin', 'Super Admin'].includes(user?.role) && (
                      <a
                        href="/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        ⚙️ Settings
                      </a>
                    )}
                  </div>
                  <select
                    name="expenseType"
                    value={formData.expenseType}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="">Select Expense Type</option>
                    {(expenseTypes[formData.category] || []).map(t => (
                      <option key={t.typeId} value={t.typeName}>
                        {t.typeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expense Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    name="expenseDate"
                    value={formData.expenseDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter specific expense description or notes"
                  rows="2"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm"
                />
              </div>

              {/* Amount and Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (LKR) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="">Select Method</option>
                    {PAYMENT_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference / Cheque Number */}
              {formData.paymentMethod === 'Cheque' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cheque Number
                  </label>
                  <input
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleChange}
                    placeholder="Enter cheque number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
              )}
              {formData.paymentMethod !== 'Cheque' && formData.paymentMethod && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleChange}
                    placeholder="Transaction ID, reference number, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Optional details, vendor info, voucher numbers..."
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium text-sm">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium text-sm shadow-sm"
                >
                  {isEditing ? 'Update Expense' : 'Create Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OtherExpenses;
