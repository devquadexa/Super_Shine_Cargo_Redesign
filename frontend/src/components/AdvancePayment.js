import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE from '../api/config';

function AdvancePayment({ job, onUpdate }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [advancePayments, setAdvancePayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [formData, setFormData] = useState({
    advancePayment: '',
    paymentMadeDate: new Date().toISOString().split('T')[0],
    paymentType: 'cash',
    checkNo: '',
    notes: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Format currency for display
  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDateDisplay = (dateValue) => {
    if (!dateValue) return '-';
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? String(dateValue) : parsed.toLocaleDateString();
  };

  const formatDateTimeDisplay = (dateValue) => {
    if (!dateValue) return '-';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return String(dateValue);

    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const resetAddForm = () => {
    setFormData({
      advancePayment: '',
      paymentMadeDate: new Date().toISOString().split('T')[0],
      paymentType: 'cash',
      checkNo: '',
      notes: ''
    });
    setEditingPaymentId(null);
  };

  const fetchAdvancePayments = async () => {
    if (!job?.jobId) {
      setAdvancePayments([]);
      return;
    }

    setLoadingPayments(true);
    try {
      const response = await fetch(`${API_BASE}/api/jobs/${job.jobId}/advance-payments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch advance payments');
      }

      const result = await response.json();
      const payments = result.data || [];

      // Backward compatibility: if no payment history rows exist yet, show legacy aggregate record.
      if (payments.length === 0 && parseFloat(job.advancePayment || 0) > 0) {
        setAdvancePayments([
          {
            advancePaymentId: 'legacy',
            amount: parseFloat(job.advancePayment || 0),
            paymentMadeDate: job.advancePaymentDate,
            paymentType: job.advancePaymentType || '-',
            checkNo: job.advancePaymentCheckNo || null,
            notes: job.advancePaymentNotes || null,
            recordedByName: job.advancePaymentRecordedBy || 'Legacy',
            isLegacy: true,
          }
        ]);
      } else {
        setAdvancePayments(payments);
      }
    } catch (error) {
      console.error('Error fetching advance payments:', error);
      setAdvancePayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Load payment history and reset add form when job changes.
  useEffect(() => {
    if (job) {
      resetAddForm();
      fetchAdvancePayments();
    }
  }, [job]);

  const sanitizeCurrencyInput = (value) => {
    if (!value) return '';

    // Keep only digits and one decimal point
    let sanitized = value.replace(/[^\d.]/g, '');
    const parts = sanitized.split('.');

    if (parts.length > 2) {
      sanitized = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    // Allow up to 2 decimal places
    if (sanitized.includes('.')) {
      const [wholePart, decimalPart] = sanitized.split('.');
      sanitized = `${wholePart}.${decimalPart.slice(0, 2)}`;
    }

    return sanitized;
  };

  const handleAdvanceAmountChange = (e) => {
    setFormData({ ...formData, advancePayment: sanitizeCurrencyInput(e.target.value) });
  };

  const handleAdvanceAmountKeyDown = (e) => {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '.'];

    if (allowedKeys.includes(e.key)) {
      if (e.key === '.' && e.target.value.includes('.')) {
        e.preventDefault();
      }
      return;
    }

    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleAdvanceAmountPaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    if (!/^\d+(\.\d{1,2})?$/.test(pastedText)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amount = parseFloat(formData.advancePayment);

      if (!formData.advancePayment || Number.isNaN(amount)) {
        setMessage('Please enter a valid advance payment amount');
        setTimeout(() => setMessage(''), 3000);
        setLoading(false);
        return;
      }
      
      if (amount < 0) {
        setMessage('Advance payment cannot be negative');
        setTimeout(() => setMessage(''), 3000);
        setLoading(false);
        return;
      }

      if (amount <= 0) {
        setMessage('Advance payment amount must be greater than 0');
        setTimeout(() => setMessage(''), 3000);
        setLoading(false);
        return;
      }

      if (amount > 0) {
        if (!formData.paymentMadeDate) {
          setMessage('Payment made date is required');
          setTimeout(() => setMessage(''), 3000);
          setLoading(false);
          return;
        }

        if (!formData.paymentType) {
          setMessage('Payment type is required');
          setTimeout(() => setMessage(''), 3000);
          setLoading(false);
          return;
        }

        if (formData.paymentType === 'check' && !formData.checkNo.trim()) {
          setMessage('Check number is required for check payments');
          setTimeout(() => setMessage(''), 3000);
          setLoading(false);
          return;
        }
      }

      const isUpdate = editingPaymentId !== null;
      const endpoint = isUpdate
        ? `${API_BASE}/api/jobs/${job.jobId}/advance-payments/${editingPaymentId}`
        : `${API_BASE}/api/jobs/${job.jobId}/advance-payments`;

      const response = await fetch(endpoint, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          advancePayment: amount,
          paymentMadeDate: formData.paymentMadeDate,
          paymentType: formData.paymentType,
          checkNo: formData.paymentType === 'check' ? formData.checkNo.trim() : null,
          notes: formData.notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update advance payment');
      }

      await response.json();
      setMessage(isUpdate ? '✓ Advance payment updated successfully' : '✓ Advance payment added successfully');
      await fetchAdvancePayments();
      resetAddForm();
      setIsEditing(false);
      
      // Call parent update function to refresh job data
      if (onUpdate) {
        onUpdate();
      }

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating advance payment:', error);
      setMessage('Error updating advance payment');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetAddForm();
    setIsEditing(false);
  };

  const openAddPaymentModal = () => {
    // On mobile, show modal with slots; on desktop, show inline form
    if (window.innerWidth <= 768) {
      setShowSlotsModal(true);
      setIsEditing(true);
    } else {
      setIsEditing(true);
    }
  };

  const closePaymentModal = () => {
    setShowSlotsModal(false);
    handleCancel();
  };

  const openEditPaymentForm = (payment) => {
    if (!payment || payment.isLegacy || !payment.advancePaymentId) {
      setMessage('Legacy advance payment entries cannot be edited. Add a new payment instead.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const paymentDate = payment.paymentMadeDate
      ? new Date(payment.paymentMadeDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setEditingPaymentId(payment.advancePaymentId);
    setFormData({
      advancePayment: payment.amount != null ? String(payment.amount) : '',
      paymentMadeDate: paymentDate,
      paymentType: payment.paymentType || 'cash',
      checkNo: payment.checkNo || '',
      notes: payment.notes || ''
    });
    setIsEditing(true);
  };

  const handleDeletePayment = async (payment) => {
    if (!payment || payment.isLegacy || !payment.advancePaymentId) {
      setMessage('Legacy advance payment entries cannot be deleted.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this advance payment record?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/jobs/${job.jobId}/advance-payments/${payment.advancePaymentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete advance payment');
      }

      setMessage('✓ Advance payment deleted successfully');
      await fetchAdvancePayments();
      if (onUpdate) {
        onUpdate();
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting advance payment:', error);
      setMessage('Error deleting advance payment');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const canEdit = user?.role === 'Super Admin' || user?.role === 'Admin' || user?.role === 'Manager';
  const totalAdvanceAmount = advancePayments.length > 0
    ? advancePayments.reduce((sum, payment) => sum + (parseFloat(payment.amount || 0)), 0)
    : parseFloat(job?.advancePayment || 0);

  return (
    <div>
      <div className="font-semibold text-gray-900 mb-2">Advance Payments</div>
      <p className="text-sm text-gray-600 mb-4">
        Record and track advance payments received for this job
      </p>

      {message && (
        <div className={`mb-4 p-4 rounded-lg border-l-4 ${message.includes('Error') ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'}`}>
          {message}
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">{editingPaymentId ? 'Edit Advance Payment' : 'Add New Advance Payment'}</h3>
              <button
                type="button"
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="advancePayment" className="block text-sm font-medium text-gray-700 mb-1">
                    Advance Amount (LKR) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="advancePayment"
                    value={formData.advancePayment}
                    onChange={handleAdvanceAmountChange}
                    onKeyDown={handleAdvanceAmountKeyDown}
                    onPaste={handleAdvanceAmountPaste}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="paymentMadeDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Made Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    id="paymentMadeDate"
                    value={formData.paymentMadeDate}
                    onChange={(e) => setFormData({ ...formData, paymentMadeDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required={parseFloat(formData.advancePayment) > 0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="paymentType"
                    value={formData.paymentType}
                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required={parseFloat(formData.advancePayment) > 0}
                  >
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank transfer">Bank Transfer</option>
                  </select>
                </div>

                {formData.paymentType === 'check' ? (
                  <div>
                    <label htmlFor="checkNo" className="block text-sm font-medium text-gray-700 mb-1">
                      Check No <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="checkNo"
                      value={formData.checkNo}
                      onChange={(e) => setFormData({ ...formData, checkNo: e.target.value })}
                      placeholder="Enter check number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required={parseFloat(formData.advancePayment) > 0}
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="notesTop" className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      id="notesTop"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Short note"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                )}
              </div>

              {formData.paymentType === 'check' && (
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter any notes about this advance payment..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    rows="3"
                  />
                </div>
              )}
            </form>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                disabled={loading}
              >
                {loading ? 'Processing...' : (editingPaymentId ? 'Update Payment' : 'Add Payment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSlotsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">{editingPaymentId ? 'Edit Advance Payment' : 'Add Advance Payment'}</h3>
              <button
                type="button"
                onClick={closePaymentModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="advancePayment-modal" className="block text-sm font-medium text-gray-700 mb-1">
                  Advance Amount (LKR) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="advancePayment-modal"
                  value={formData.advancePayment}
                  onChange={handleAdvanceAmountChange}
                  onKeyDown={handleAdvanceAmountKeyDown}
                  onPaste={handleAdvanceAmountPaste}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="paymentMadeDate-modal" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Made Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  id="paymentMadeDate-modal"
                  value={formData.paymentMadeDate}
                  onChange={(e) => setFormData({ ...formData, paymentMadeDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required={parseFloat(formData.advancePayment) > 0}
                />
              </div>

              <div>
                <label htmlFor="paymentType-modal" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Type <span className="text-red-600">*</span>
                </label>
                <select
                  id="paymentType-modal"
                  value={formData.paymentType}
                  onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required={parseFloat(formData.advancePayment) > 0}
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank transfer">Bank Transfer</option>
                </select>
              </div>

              {formData.paymentType === 'check' && (
                <div>
                  <label htmlFor="checkNo-modal" className="block text-sm font-medium text-gray-700 mb-1">
                    Check No <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="checkNo-modal"
                    value={formData.checkNo}
                    onChange={(e) => setFormData({ ...formData, checkNo: e.target.value })}
                    placeholder="Enter check number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required={parseFloat(formData.advancePayment) > 0}
                  />
                </div>
              )}

              <div>
                <label htmlFor="notes-modal" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes-modal"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Enter any notes about this advance payment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows="3"
                />
              </div>

              <div />
            </form>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={closePaymentModal}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                disabled={loading}
              >
                {loading ? 'Processing...' : (editingPaymentId ? 'Update Payment' : 'Add Payment')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {loadingPayments && advancePayments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-block mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-600">Loading advance payments...</p>
          </div>
        ) : advancePayments.length === 0 && totalAdvanceAmount === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">💳</div>
            <h4 className="font-semibold text-gray-900 mb-2">No Advance Payments Yet</h4>
            <p className="text-gray-600 mb-6">Add the first advance payment for this job</p>
            {canEdit && (
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                onClick={openAddPaymentModal}
                disabled={loadingPayments}
              >
                + Add Payment
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-900">Payment Records</div>
              {canEdit && (
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium text-sm"
                  onClick={openAddPaymentModal}
                  disabled={loadingPayments}
                  title={advancePayments.length > 0 || totalAdvanceAmount > 0 ? 'Add another advance payment' : 'Add payment'}
                >
                  + Add Payment
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actual Cost</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Paid By</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Payment Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                    {canEdit && <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {advancePayments.map((payment, index) => {
                    const paymentType = (payment.paymentType || '').toLowerCase();
                    const description = paymentType === 'check'
                      ? `Advance Payment (Check #${payment.checkNo || '-'})`
                      : `Advance Payment (${payment.paymentType || '-'})`;

                    return (
                      <tr key={`${payment.advancePaymentId || index}-${payment.paymentMadeDate || index}`} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-900">{description}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">LKR {formatCurrency(payment.amount)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{payment.recordedByName || payment.recordedBy || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateTimeDisplay(payment.paymentMadeDate)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{payment.notes || '-'}</td>
                        {canEdit && (
                          <td className="px-6 py-4 text-sm flex gap-2">
                            <button
                              className={`${payment.isLegacy ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'} transition p-1`}
                              onClick={() => openEditPaymentForm(payment)}
                              disabled={loading || payment.isLegacy}
                              title={payment.isLegacy ? 'Legacy records cannot be edited' : 'Edit payment'}
                              aria-label="Edit payment"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className={`${payment.isLegacy ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'} transition p-1`}
                              onClick={() => handleDeletePayment(payment)}
                              disabled={loading || payment.isLegacy}
                              title={payment.isLegacy ? 'Legacy records cannot be deleted' : 'Delete payment'}
                              aria-label="Delete payment"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end items-center">
                <span className="text-sm font-semibold text-gray-900 mr-4">Total Advance Cost:</span>
                <span className="text-lg font-bold text-gray-900">LKR {formatCurrency(totalAdvanceAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdvancePayment;
